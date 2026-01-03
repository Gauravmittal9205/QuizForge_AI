// db.ts
import mongoose, { Connection, ConnectOptions } from 'mongoose';

// Extend the NodeJS namespace to include our environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGO_URI: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}

// Ensure required environment variables are set
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined in environment variables');
}

const connectDB = async (): Promise<Connection> => {
  try {
    const options: ConnectOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions;

    const connection = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`MongoDB Connected: ${connection.connection.host}`);
    return connection.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;