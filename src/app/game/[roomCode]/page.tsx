'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CATEGORIES, SPICY_LEVELS, type Category, type SpicyLevel } from '@/lib/constants';
import { generateQuestionAction, analyzeAndSummarizeAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, ClipboardCopy, PartyPopper, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { useRouter } from 'next/navigation';

type GameStep = 'lobby' | 'categories' | 'spicy' | 'game' | 'summary';
type GameRound = { question: string; answer: string };

const TOTAL_QUESTIONS = 5;

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<GameStep>('lobby');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSpicyLevel, setSelectedSpicyLevel] = useState<SpicyLevel['name']>('Mild');
  const [gameRounds, setGameRounds] = useState<GameRound[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (step === 'summary') return 100;
    if (step === 'game') return (gameRounds.length / TOTAL_QUESTIONS) * 100;
    if (step === 'spicy') return 20;
    if (step === 'categories') return 10;
    return 0;
  }, [step, gameRounds.length]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The room code has been copied.',
    });
  };

  const handleToggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };
  
  const handleStartGame = async () => {
    setIsLoading(true);
    setError(null);
    const result = await generateQuestionAction({
        categories: selectedCategories,
        spicyLevel: selectedSpicyLevel,
        previousQuestionsAndAnswers: [],
    });

    if ('question' in result) {
        setCurrentQuestion(result.question);
        setStep('game');
    } else {
        setError(result.error);
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
    }
    setIsLoading(false);
  };
  
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast({ title: "Answer can't be empty", variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setError(null);
    const updatedRounds = [...gameRounds, { question: currentQuestion, answer: currentAnswer }];
    setGameRounds(updatedRounds);
    setCurrentAnswer('');
    
    if (updatedRounds.length >= TOTAL_QUESTIONS) {
        // Game over, generate summary
        const summaryResult = await analyzeAndSummarizeAction({
            questions: updatedRounds.map(r => r.question),
            answers: updatedRounds.map(r => r.answer),
            categories: selectedCategories,
            spicyLevel: selectedSpicyLevel,
        });

        if ('summary' in summaryResult) {
            setSummary(summaryResult.summary);
            setStep('summary');
        } else {
            setError(summaryResult.error);
        }
    } else {
        // Next question
        const result = await generateQuestionAction({
            categories: selectedCategories,
            spicyLevel: selectedSpicyLevel,
            previousQuestionsAndAnswers: updatedRounds.map(r => ({question: r.question, answer: r.answer})),
        });

        if ('question' in result) {
            setCurrentQuestion(result.question);
        } else {
            setError(result.error);
        }
    }
    setIsLoading(false);
  };
  
  const renderStepContent = (): ReactNode => {
    switch (step) {
      case 'lobby':
        return (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Your Private Room</CardTitle>
              <CardDescription>Share this code with your partner to let them join.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 rounded-lg border border-dashed p-4 justify-between">
                <span className="font-mono text-lg font-bold text-primary">{roomCode}</span>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  <ClipboardCopy className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">Waiting for partner... (simulated)</p>
              <Button onClick={() => setStep('categories')} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "I'm Ready!"}
              </Button>
            </CardContent>
          </Card>
        );
      case 'categories':
        return (
          <div className="w-full max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-2">Choose Your Categories</h2>
            <p className="text-muted-foreground text-center mb-8">Select at least one theme to explore together.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {CATEGORIES.map((cat) => (
                <Card
                  key={cat.name}
                  onClick={() => handleToggleCategory(cat.name)}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedCategories.includes(cat.name) ? 'border-primary ring-2 ring-primary shadow-lg' : 'hover:border-primary/50'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center aspect-square">
                    <cat.icon className={`w-8 h-8 mb-2 ${selectedCategories.includes(cat.name) ? 'text-primary' : ''}`} />
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={() => setStep('spicy')} className="w-full max-w-xs mx-auto flex" size="lg" disabled={selectedCategories.length === 0}>
                Next
            </Button>
          </div>
        );
      case 'spicy':
        return (
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Set The Mood</h2>
            <p className="text-muted-foreground text-center mb-8">Choose your desired level of intensity. The game will use the mildest level chosen.</p>
             <RadioGroup
                defaultValue="Mild"
                onValueChange={(value: SpicyLevel['name']) => setSelectedSpicyLevel(value)}
                className="space-y-4"
              >
                {SPICY_LEVELS.map((level) => (
                    <Card key={level.name} className="has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                        <Label htmlFor={level.name} className="flex items-start space-x-4 p-4 cursor-pointer">
                            <RadioGroupItem value={level.name} id={level.name} className="mt-1"/>
                            <div className="flex-1">
                                <h3 className="font-semibold">{level.name}</h3>
                                <p className="text-muted-foreground text-sm">{level.description}</p>
                            </div>
                        </Label>
                    </Card>
                ))}
             </RadioGroup>
            <Button onClick={handleStartGame} className="w-full mt-8" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Game"}
            </Button>
          </div>
        );
      case 'game':
        return (
          <div className="w-full max-w-xl">
            <p className="text-center text-primary font-semibold mb-4">Question {gameRounds.length + 1} of {TOTAL_QUESTIONS}</p>
            <Card>
                <CardContent className="p-6">
                    <blockquote className="text-center text-2xl font-semibold leading-relaxed font-headline mb-6">
                       “{currentQuestion}”
                    </blockquote>
                    <Textarea 
                        placeholder="Your answer..." 
                        rows={5}
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        className="text-base"
                    />
                    <Button onClick={handleSubmitAnswer} className="w-full mt-6" size="lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Answer'}
                    </Button>
                </CardContent>
            </Card>
          </div>
        );
      case 'summary':
        return (
          <div className="w-full max-w-2xl">
              <Card>
                  <CardHeader className="items-center text-center">
                    <PartyPopper className="w-12 h-12 text-primary mb-2" />
                    <CardTitle className="text-3xl">Your Session Summary</CardTitle>
                    <CardDescription>A little insight from your conversation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="prose prose-invert prose-p:text-foreground/90 prose-headings:text-primary max-w-none text-base whitespace-pre-wrap p-4 bg-secondary rounded-md">
                          {summary}
                      </div>
                      <Button onClick={() => router.push('/')} className="w-full mt-6" size="lg">
                        Play Again
                      </Button>
                  </CardContent>
              </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
        <div className="absolute top-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
                <Logo className="w-10 h-10 text-primary cursor-pointer" onClick={() => router.push('/')} />
                {step !== 'lobby' && <Progress value={progress} className="w-1/2" />}
            </div>
        </div>
        
        {error && (
            <Alert variant="destructive" className="max-w-md mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>An Error Occurred</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

        <div className="flex-grow flex items-center justify-center w-full">
            <AnimatePresence mode="wait">
                <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full flex justify-center"
                >
                {isLoading && step !== 'game' && step !== 'lobby' ? <Loader2 className="h-16 w-16 animate-spin text-primary" /> : renderStepContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}
