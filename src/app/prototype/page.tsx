
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Wind, Sunrise, Sunset, Sparkles, Zap, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';

const spicyLevels = [
  { name: 'Mild', icon: Wind, description: "A gentle breeze. Flirty, fun, and easy." },
  { name: 'Medium', icon: Sunrise, description: "Warming up. Getting personal and a little daring." },
  { name: 'Hot', icon: Flame, description: "Playing with fire. Explicit, provocative questions." },
  { name: 'Extra-Hot', icon: Zap, description: "Wildfire. For the bold and adventurous only." },
];

export default function PrototypePage() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background font-body p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <Ghost className="absolute top-1/4 left-1/4 w-64 h-64 text-primary/30 transform -rotate-12" />
            <Sparkles className="absolute bottom-1/4 right-1/4 w-48 h-48 text-accent/50 transform rotate-12" />
            <Flame className="absolute top-10 right-20 w-32 h-32 text-secondary/40" />
            <Wind className="absolute bottom-10 left-20 w-24 h-24 text-primary/20" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
            <Logo className="w-16 h-16 text-primary mb-4" />
            <h1 className="text-5xl md:text-7xl font-bold font-headline text-foreground leading-tight">
                Set the Mood
            </h1>
            <p className="mt-2 text-lg text-muted-foreground max-w-lg">
                Choose your heat. The game will play at the mildest level anyone picks.
            </p>

            <motion.div 
                className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {spicyLevels.map((level) => (
                    <motion.div
                        key={level.name}
                        variants={cardVariants}
                        onClick={() => setSelectedLevel(level.name)}
                        className={cn(
                            "group relative rounded-xl border-4 p-6 text-center cursor-pointer transition-all duration-300 ease-in-out overflow-hidden",
                            selectedLevel === level.name
                                ? 'border-primary bg-primary/10 shadow-2xl shadow-primary/20'
                                : 'border-border bg-card hover:border-primary hover:shadow-xl hover:-translate-y-2'
                        )}
                    >
                        <div className={cn(
                            "absolute -bottom-10 -right-10 w-32 h-32 text-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                             selectedLevel === level.name && "opacity-100"
                        )}>
                           <level.icon className="w-full h-full" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className={cn(
                                "flex items-center justify-center w-20 h-20 rounded-full mb-4 transition-colors duration-300",
                                selectedLevel === level.name ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                            )}>
                                <level.icon className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold font-headline">{level.name}</h3>
                            <p className="mt-2 text-muted-foreground text-sm h-10">{level.description}</p>
                        </div>

                        <AnimatePresence>
                        {selectedLevel === level.name && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="absolute -top-3 -right-3 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground"
                            >
                                <Sparkles className="w-6 h-6" />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </motion.div>

            <AnimatePresence>
                {selectedLevel && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12"
                    >
                        <Button size="lg" className="text-lg font-bold px-12 py-8 rounded-full shadow-lg shadow-primary/30">
                            Confirm {selectedLevel}
                            <ArrowRight className="ml-2" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}

// Dummy icon for the button
const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
    </svg>
);
