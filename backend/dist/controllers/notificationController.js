"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationHealth = exports.broadcastNotification = exports.sendNotificationToUser = exports.handleSSEConnection = exports.handleWebSocketConnection = exports.notificationService = void 0;
const ws_1 = require("ws");
class NotificationService {
    constructor() {
        this.wss = null;
        this.clients = new Map();
        this.httpServer = null;
        this.clients = new Map();
    }
    initialize(httpServer) {
        this.httpServer = httpServer;
        // Create WebSocket server
        this.wss = new ws_1.WebSocketServer({
            server: httpServer,
            path: '/ws/notifications'
        });
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        console.log('WebSocket server initialized for notifications');
    }
    handleConnection(ws, req) {
        const url = new URL(req.url || '', `http://localhost:5001${req.url || ''}`);
        const userId = url.searchParams.get('userId');
        if (!userId) {
            console.log('Connection rejected: No userId provided');
            ws.close(1008, 'UserId required');
            return;
        }
        console.log(`Client connected: ${userId}`);
        // Add client to the list
        if (!this.clients.has(userId)) {
            this.clients.set(userId, []);
        }
        const client = {
            ws,
            userId,
            lastPing: Date.now()
        };
        this.clients.get(userId).push(client);
        // Handle messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'ping') {
                    // Respond with pong
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: Date.now()
                    }));
                }
            }
            catch (error) {
                console.error('Error parsing message:', error);
            }
        });
        // Handle disconnection
        ws.on('close', () => {
            console.log(`Client disconnected: ${userId}`);
            this.removeClient(userId, ws);
        });
        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for client ${userId}:`, error);
            this.removeClient(userId, ws);
        });
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'notification',
            payload: {
                id: 'welcome-' + Date.now(),
                type: 'system',
                title: '🔔 Connected!',
                message: 'Real-time notifications are now active.',
                timestamp: Date.now(),
                read: false,
                priority: 'low'
            },
            timestamp: Date.now()
        }));
    }
    removeClient(userId, ws) {
        const userClients = this.clients.get(userId);
        if (userClients) {
            const filtered = userClients.filter(client => client.ws !== ws);
            if (filtered.length === 0) {
                this.clients.delete(userId);
            }
            else {
                this.clients.set(userId, filtered);
            }
        }
    }
    sendNotificationToUser(userId, notification) {
        const userClients = this.clients.get(userId);
        if (!userClients || userClients.length === 0) {
            console.log(`No active clients for user: ${userId}`);
            return;
        }
        const message = {
            id: notification.id || 'notification-' + Date.now(),
            type: 'notification',
            payload: {
                ...notification,
                timestamp: notification.timestamp || Date.now()
            },
            timestamp: Date.now()
        };
        // Send to all connected clients for this user
        userClients.forEach(client => {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    client.ws.send(JSON.stringify(message));
                }
                catch (error) {
                    console.error(`Error sending notification to client ${userId}:`, error);
                    // Remove problematic client
                    this.removeClient(userId, client.ws);
                }
            }
        });
        console.log(`Notification sent to user ${userId}:`, notification.title);
    }
    broadcastNotification(notification) {
        // Send to all connected users
        this.clients.forEach((userClients, userId) => {
            this.sendNotificationToUser(userId, notification);
        });
    }
    sendStudyReminder(userId, subject, topic, timeUntil) {
        const notification = {
            id: 'reminder-' + Date.now(),
            type: 'study_reminder',
            title: `📚 Study Reminder: ${subject}`,
            message: `Time to study ${topic}! Session starts in ${timeUntil}.`,
            timestamp: Date.now(),
            read: false,
            priority: 'high',
            actionUrl: '/dashboard/revision',
            actionText: 'Start Session',
            metadata: {
                subject,
                topic
            }
        };
        this.sendNotificationToUser(userId, notification);
    }
    sendAchievement(userId, achievement, details) {
        const notification = {
            id: 'achievement-' + Date.now(),
            type: 'achievement',
            title: `🎉 Achievement Unlocked!`,
            message: `${achievement}: ${details}`,
            timestamp: Date.now(),
            read: false,
            priority: 'medium',
            metadata: {
                achievement
            }
        };
        this.sendNotificationToUser(userId, notification);
    }
    sendDeadlineAlert(userId, subject, deadline, daysLeft) {
        const notification = {
            id: 'deadline-' + Date.now(),
            type: 'deadline',
            title: `⚠️ Deadline Alert: ${subject}`,
            message: `Deadline approaching in ${daysLeft} day${daysLeft > 1 ? 's' : ''}!`,
            timestamp: Date.now(),
            read: false,
            priority: daysLeft <= 3 ? 'urgent' : 'high',
            actionUrl: '/dashboard/syllabus',
            actionText: 'View Progress',
            metadata: {
                subject,
                deadline
            }
        };
        this.sendNotificationToUser(userId, notification);
    }
    // Health check for connections
    healthCheck() {
        const totalClients = Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.length, 0);
        const uniqueUsers = this.clients.size;
        return {
            connected: true,
            totalClients,
            uniqueUsers,
            timestamp: Date.now()
        };
    }
}
// Singleton instance
exports.notificationService = new NotificationService();
// Controller functions
const handleWebSocketConnection = (req, res) => {
    // WebSocket connections are handled by the service initialization
    res.status(200).json({ message: 'WebSocket server is running' });
};
exports.handleWebSocketConnection = handleWebSocketConnection;
const handleSSEConnection = (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    // Send welcome message
    const welcomeNotification = {
        id: 'welcome-' + Date.now(),
        type: 'system',
        title: '🔔 Connected!',
        message: 'Real-time notifications are now active.',
        timestamp: Date.now(),
        read: false,
        priority: 'low'
    };
    res.write(`data: ${JSON.stringify(welcomeNotification)}\n\n`);
    // Store the response for later use
    const clientResponse = res;
    // Set up cleanup on connection close
    req.on('close', () => {
        console.log(`SSE client disconnected: ${userId}`);
    });
    // Function to send notifications to this client
    const sendNotification = (notification) => {
        try {
            clientResponse.write(`data: ${JSON.stringify(notification)}\n\n`);
        }
        catch (error) {
            console.error('Error sending SSE notification:', error);
        }
    };
    // Store the send function for the service to use
    req.sendNotification = sendNotification;
    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
        try {
            clientResponse.write(`: heartbeat\n\n`);
        }
        catch (error) {
            clearInterval(heartbeat);
        }
    }, 30000);
    // Cleanup on connection close
    req.on('close', () => {
        clearInterval(heartbeat);
    });
};
exports.handleSSEConnection = handleSSEConnection;
const sendNotificationToUser = (userId, notification) => {
    exports.notificationService.sendNotificationToUser(userId, notification);
};
exports.sendNotificationToUser = sendNotificationToUser;
const broadcastNotification = (notification) => {
    exports.notificationService.broadcastNotification(notification);
};
exports.broadcastNotification = broadcastNotification;
const getNotificationHealth = (req, res) => {
    const health = exports.notificationService.healthCheck();
    res.json(health);
};
exports.getNotificationHealth = getNotificationHealth;
