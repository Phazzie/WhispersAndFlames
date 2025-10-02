
import Image from 'next/image';
import HomePageClient from '@/components/home-page';
import { Logo } from '@/components/icons/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'home-hero');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover opacity-20"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background" />
      </div>

      <div className="z-10 flex flex-col items-center text-center max-w-3xl w-full">
        <Logo className="w-24 h-24 mb-4 text-primary" />
        <h1 className={cn(
          "text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-transparent",
          "bg-clip-text bg-gradient-to-r from-primary/80 via-primary to-primary/80",
          "animate-pulse-slow"
        )}>
          Whispers and Flames
        </h1>
        <p className="mt-4 text-2xl sm:text-3xl text-foreground/90 font-light tracking-wide">
          Your turn to play with fire.
        </p>

        <div className="w-full max-w-md mt-12">
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6">
                Ready to find out what you both really want? <br/>Ember is waiting.
            </p>
          <HomePageClient />
        </div>
      </div>
    </main>
  );
}
