
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Wind, Sunrise, Sparkles, Zap, Ghost, ArrowRight } from 'lucide-react';
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
        staggerChildren: 0.15,
        delayChildren: 0.2,
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
    hover: {
        scale: 1.05,
        translateY: -8,
        boxShadow: "0px 20px 30px hsla(var(--primary) / 0.2)",
        transition: { type: 'spring', stiffness: 300, damping: 15 }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background font-body p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <Ghost className="absolute top-1/4 left-1/4 w-64 h-64 text-primary/30 transform -rotate-12 animate-pulse-slow" />
            <Sparkles className="absolute bottom-1/4 right-1/4 w-48 h-48 text-accent/50 transform rotate-12 animate-pulse-slow delay-500" />
            <Flame className="absolute top-10 right-20 w-32 h-32 text-secondary/40 animate-pulse-slow delay-1000" />
            <Wind className="absolute bottom-10 left-20 w-24 h-24 text-primary/20 animate-pulse-slow delay-700" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center w-full">
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
                        whileHover="hover"
                        onClick={() => setSelectedLevel(level.name)}
                        className={cn(
                            "group relative rounded-xl border-4 p-6 text-center cursor-pointer transition-colors duration-300 ease-in-out overflow-hidden",
                            selectedLevel === level.name
                                ? 'border-primary bg-primary/10 shadow-2xl shadow-primary/20'
                                : 'border-border bg-card'
                        )}
                    >
                        <div className={cn(
                            "absolute -bottom-10 -right-10 w-32 h-32 text-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                             selectedLevel === level.name && "opacity-10"
                        )}>
                           <level.icon className="w-full h-full" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div 
                                className={cn(
                                    "flex items-center justify-center w-20 h-20 rounded-full mb-4 transition-colors duration-300",
                                    selectedLevel === level.name ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                                )}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                animate={{ scale: selectedLevel === level.name ? 1.1 : 1 }}
                            >
                                <level.icon className="w-10 h-10" />
                            </motion.div>
                            <h3 className="text-2xl font-bold font-headline">{level.name}</h3>
                            <p className="mt-2 text-muted-foreground text-sm h-10">{level.description}</p>
                        </div>

                        <AnimatePresence>
                        {selectedLevel === level.name && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                className="absolute -top-3 -right-3 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-accent-foreground"
                            >
                                <Sparkles className="w-6 h-6" />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </motion.div>

            <div className="mt-12 h-20 flex items-center">
                <AnimatePresence>
                    {selectedLevel && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.2, type: 'spring', stiffness: 100 } }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                        >
                            <Button size="lg" className="text-lg font-bold px-12 py-8 rounded-full shadow-lg shadow-primary/30 transform hover:scale-105 transition-transform duration-300">
                                Confirm {selectedLevel}
                                <ArrowRight className="ml-2 w-6 h-6" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
}
