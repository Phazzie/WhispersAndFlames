
import Image from 'next/image';
import HomePageClient from '@/components/home-page';
import { Logo } from '@/components/icons/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'home-hero');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-hidden font-body">
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

      <div className="z-10 flex flex-col items-center text-center max-w-2xl w-full">
        <Logo className="w-24 h-24 mb-4 text-primary" />
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline tracking-tight text-foreground">
          Whispers and Flames
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-lg">
          Ignite connection and explore the depths of your intimacy through guided conversations.
        </p>

        <div className="w-full max-w-md mt-10">
          <HomePageClient />
        </div>
      </div>
    </main>
  );
}
