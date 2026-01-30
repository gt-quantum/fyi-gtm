export interface Category {
  name: string;
  slug: string;
  description: string;
  icon?: string;
  color?: string;
  toolCount: number;
  featured: boolean;
  order: number;
}

export const categories: Category[] = [
  {
    name: "Image Generation",
    slug: "image-generation",
    description: "AI tools for creating images, art, and visual content from text prompts.",
    icon: "image",
    color: "#8B5CF6",
    toolCount: 156,
    featured: true,
    order: 1
  },
  {
    name: "Chat",
    slug: "chat",
    description: "Conversational AI assistants and chatbots for various tasks.",
    icon: "message-circle",
    color: "#3B82F6",
    toolCount: 89,
    featured: true,
    order: 2
  },
  {
    name: "Writing",
    slug: "writing",
    description: "AI writing assistants for content creation, copywriting, and editing.",
    icon: "edit",
    color: "#10B981",
    toolCount: 124,
    featured: true,
    order: 3
  },
  {
    name: "Video",
    slug: "video",
    description: "AI-powered video creation, editing, and enhancement tools.",
    icon: "video",
    color: "#EF4444",
    toolCount: 67,
    featured: true,
    order: 4
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Text-to-speech, voice cloning, and music generation tools.",
    icon: "headphones",
    color: "#F59E0B",
    toolCount: 78,
    featured: true,
    order: 5
  },
  {
    name: "Code",
    slug: "code",
    description: "AI coding assistants, code completion, and development tools.",
    icon: "code",
    color: "#06B6D4",
    toolCount: 92,
    featured: true,
    order: 6
  },
  {
    name: "Productivity",
    slug: "productivity",
    description: "AI tools to enhance workflow, automate tasks, and boost efficiency.",
    icon: "zap",
    color: "#8B5CF6",
    toolCount: 145,
    featured: false,
    order: 7
  },
  {
    name: "Search",
    slug: "search",
    description: "AI-powered search engines and research assistants.",
    icon: "search",
    color: "#3B82F6",
    toolCount: 34,
    featured: false,
    order: 8
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "AI tools for marketing automation, analytics, and content.",
    icon: "trending-up",
    color: "#EC4899",
    toolCount: 87,
    featured: false,
    order: 9
  },
  {
    name: "Design",
    slug: "design",
    description: "AI-assisted design tools for graphics, UI/UX, and branding.",
    icon: "palette",
    color: "#F97316",
    toolCount: 112,
    featured: true,
    order: 10
  },
  {
    name: "Business",
    slug: "business",
    description: "AI solutions for business operations, analytics, and management.",
    icon: "briefcase",
    color: "#14B8A6",
    toolCount: 98,
    featured: false,
    order: 11
  },
  {
    name: "Education",
    slug: "education",
    description: "AI tools for learning, tutoring, and educational content.",
    icon: "book",
    color: "#6366F1",
    toolCount: 56,
    featured: false,
    order: 12
  }
];
