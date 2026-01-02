import {
  Brain,
  Zap,
  Palette,
  Music,
  BarChart,
  ShieldCheck,
} from "lucide-react";
import { JSX } from "react";
import Navbar from "../../components/Navbar";

type Feature = {
  icon: JSX.Element;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI-powered generation",
    description:
      "Create full quiz scripts instantly from any topic with intelligent AI reasoning.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "One-click rendering",
    description:
      "Transform quizzes into interactive content with animations and transitions.",
  },
  {
    icon: <Palette className="w-6 h-6" />,
    title: "Custom branding",
    description:
      "Apply your brand colors, fonts, and identity automatically across all content.",
  },
  {
    icon: <Music className="w-6 h-6" />,
    title: "Trending audio library",
    description:
      "Access royalty-free music and AI voiceovers for engaging experiences.",
  },
  {
    icon: <BarChart className="w-6 h-6" />,
    title: "Analytics & insights",
    description:
      "Track engagement, performance, and user interactions in real time.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Secure & scalable",
    description:
      "Enterprise-grade security with scalable cloud infrastructure.",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Everything You Need
            </p>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">
              Create viral quizzes with powerful features
            </h2>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                id={`feature-${index}`}
                key={index}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 scroll-mt-24"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 text-gray-900 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
