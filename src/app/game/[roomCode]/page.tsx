
'use client';

import { useState, useMemo, type ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
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
import { Loader2, Sparkles, ClipboardCopy, PartyPopper, AlertTriangle, Users } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type GameStep = 'lobby' | 'categories' | 'spicy' | 'game' | 'summary';
type Player = { id: string; name: string; isReady: boolean };
type GameState = {
  step: GameStep;
  players: Player[];
  hostId: string;
  selectedCategories: string[];
  selectedSpicyLevel: SpicyLevel['name'];
  gameRounds: { question: string; answers: Record<string, string> }[];
  currentQuestion: string;
  summary: string;
};

const TOTAL_QUESTIONS = 5;

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pId = sessionStorage.getItem(`player_id_${roomCode}`);
    if (!pId) {
      pId = `player_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(`player_id_${roomCode}`, pId);
    }
    setPlayerId(pId);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const roomRef = doc(db, 'games', roomCode);

    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        // If player is not in the game, add them.
        if (data.players.length < 2 && !data.players.find(p => p.id === playerId)) {
          const newPlayer: Player = { id: playerId, name: `Player ${data.players.length + 1}`, isReady: false };
          await updateDoc(roomRef, { players: [...data.players, newPlayer] });
        }
        setGameState(data);
      } else {
        // Create new game if it doesn't exist
        const newGame: GameState = {
          step: 'lobby',
          players: [{ id: playerId, name: 'Player 1', isReady: false }],
          hostId: playerId,
          selectedCategories: [],
          selectedSpicyLevel: 'Mild',
          gameRounds: [],
          currentQuestion: '',
          summary: '',
        };
        await setDoc(roomRef, newGame);
        setGameState(newGame);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode, playerId]);
  
  const me = useMemo(() => gameState?.players.find(p => p.id === playerId), [gameState, playerId]);
  const partner = useMemo(() => gameState?.players.find(p => p.id !== playerId), [gameState, playerId]);
  const isHost = useMemo(() => gameState?.hostId === playerId, [gameState, playerId]);

  const progress = useMemo(() => {
    if (!gameState) return 0;
    const { step, gameRounds } = gameState;
    if (step === 'summary') return 100;
    if (step === 'game') return (gameRounds.length / TOTAL_QUESTIONS) * 100;
    if (step === 'spicy') return 20;
    if (step === 'categories') return 10;
    return 0;
  }, [gameState]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The room code has been copied.',
    });
  };

  const updateGameState = async (newState: Partial<GameState>) => {
    const roomRef = doc(db, 'games', roomCode);
    await updateDoc(roomRef, newState);
  };

  const handleToggleCategory = (categoryName: string) => {
    if (!gameState) return;
    const currentCategories = gameState.selectedCategories;
    const newCategories = currentCategories.includes(categoryName)
        ? currentCategories.filter((c) => c !== categoryName)
        : [...currentCategories, categoryName];
    updateGameState({ selectedCategories: newCategories });
  };
  
  const handlePlayerReady = async () => {
    if (!me || !gameState) return;
    const updatedPlayers = gameState.players.map(p => p.id === me.id ? {...p, isReady: true} : p);
    await updateGameState({ players: updatedPlayers });

    // If both players are ready, move to next step
    if (updatedPlayers.every(p => p.isReady)) {
       await updateGameState({ step: 'categories', players: gameState.players.map(p => ({...p, isReady: false})) });
    }
  }

  const handleCategoriesNext = async () => {
    if(!gameState || gameState.selectedCategories.length === 0) return;
     // Host confirms categories, move to spicy level selection
    await updateGameState({ step: 'spicy' });
  }

  const handleStartGame = async () => {
    if (!gameState) return;
    setIsLoading(true);
    setError(null);
    const result = await generateQuestionAction({
        categories: gameState.selectedCategories,
        spicyLevel: gameState.selectedSpicyLevel,
        previousQuestionsAndAnswers: [],
    });

    if ('question' in result) {
        await updateGameState({ currentQuestion: result.question, step: 'game' });
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
    if (!currentAnswer.trim() || !gameState || !me) {
      toast({ title: "Answer can't be empty", variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const roomRef = doc(db, 'games', roomCode);
    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as GameState;

    const currentRoundIndex = currentGameState.gameRounds.length;
    let newGameRounds = [...currentGameState.gameRounds];

    if (newGameRounds[currentRoundIndex]) {
      // Round exists, add answer
      newGameRounds[currentRoundIndex].answers[me.id] = currentAnswer;
    } else {
      // New round
      newGameRounds.push({
        question: currentGameState.currentQuestion,
        answers: { [me.id]: currentAnswer },
      });
    }

    // Check if both players answered
    const bothAnswered = Object.keys(newGameRounds[currentRoundIndex].answers).length === 2;

    if (bothAnswered) {
      if (newGameRounds.length >= TOTAL_QUESTIONS) {
        // Game over
        const allAnswers = newGameRounds.flatMap(r => Object.values(r.answers));
        const summaryResult = await analyzeAndSummarizeAction({
            questions: newGameRounds.map(r => r.question),
            answers: allAnswers,
            categories: currentGameState.selectedCategories,
            spicyLevel: currentGameState.selectedSpicyLevel,
        });
        if ('summary' in summaryResult) {
            await updateGameState({ gameRounds: newGameRounds, summary: summaryResult.summary, step: 'summary' });
        } else {
            setError(summaryResult.error);
        }
      } else {
        // Next question
        const result = await generateQuestionAction({
            categories: currentGameState.selectedCategories,
            spicyLevel: currentGameState.selectedSpicyLevel,
            previousQuestionsAndAnswers: newGameRounds.map(r => ({question: r.question, answer: Object.values(r.answers).join(', ')})),
        });
        if ('question' in result) {
            await updateGameState({ gameRounds: newGameRounds, currentQuestion: result.question });
        } else {
            setError(result.error);
        }
      }
    } else {
      // Just update answers
      await updateGameState({ gameRounds: newGameRounds });
    }
    
    setCurrentAnswer('');
    setIsLoading(false);
  };
  
  if (!gameState || !me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Setting up your game...</p>
      </div>
    );
  }
  
  const { step, players, selectedCategories, selectedSpicyLevel, currentQuestion, gameRounds, summary } = gameState;

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
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <span className="font-semibold">{me.name} (You)</span>
                  {me.isReady ? <span className="text-sm text-green-400">Ready</span> : <span className="text-sm text-amber-400">Waiting...</span>}
                </div>
                {partner ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <span className="font-semibold">{partner.name}</span>
                     {partner.isReady ? <span className="text-sm text-green-400">Ready</span> : <span className="text-sm text-amber-400">Waiting...</span>}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center p-3">Waiting for partner to join...</div>
                )}
              </div>
              <Button onClick={handlePlayerReady} className="w-full" size="lg" disabled={me.isReady || isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "I'm Ready!"}
              </Button>
            </CardContent>
          </Card>
        );
      case 'categories':
        return (
          <div className="w-full max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-2">Choose Your Categories</h2>
            <p className="text-muted-foreground text-center mb-8">
              {isHost ? 'Select at least one theme to explore together.' : 'Your partner is choosing the categories.'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {CATEGORIES.map((cat) => (
                <Card
                  key={cat.name}
                  onClick={() => isHost && handleToggleCategory(cat.name)}
                  className={`transition-all duration-200 ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                    selectedCategories.includes(cat.name) ? 'border-primary ring-2 ring-primary shadow-lg' : isHost ? 'hover:border-primary/50' : ''
                  }`}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center aspect-square">
                    <cat.icon className={`w-8 h-8 mb-2 ${selectedCategories.includes(cat.name) ? 'text-primary' : ''}`} />
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
            {isHost && (
              <Button onClick={handleCategoriesNext} className="w-full max-w-xs mx-auto flex" size="lg" disabled={selectedCategories.length === 0}>
                  Next
              </Button>
            )}
          </div>
        );
      case 'spicy':
         const handleSpicySelect = (value: SpicyLevel['name']) => {
            if (!isHost) return;
            // Only the host can change the spicy level.
            // A more collaborative approach would be to let both vote.
            updateGameState({ selectedSpicyLevel: value });
        };
        return (
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Set The Mood</h2>
            <p className="text-muted-foreground text-center mb-8">
              {isHost ? 'Choose your desired level of intensity.' : 'Your partner is setting the mood...'}
            </p>
             <RadioGroup
                value={selectedSpicyLevel}
                onValueChange={handleSpicySelect}
                className="space-y-4"
                disabled={!isHost}
              >
                {SPICY_LEVELS.map((level) => (
                    <Card key={level.name} className={`has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary ${!isHost && 'opacity-70'}`}>
                        <Label htmlFor={level.name} className={`flex items-start space-x-4 p-4 ${isHost ? 'cursor-pointer' : 'cursor-default'}`}>
                            <RadioGroupItem value={level.name} id={level.name} className="mt-1"/>
                            <div className="flex-1">
                                <h3 className="font-semibold">{level.name}</h3>
                                <p className="text-muted-foreground text-sm">{level.description}</p>
                            </div>
                        </Label>
                    </Card>
                ))}
             </RadioGroup>
            {isHost && (
              <Button onClick={handleStartGame} className="w-full mt-8" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Game"}
              </Button>
            )}
          </div>
        );
      case 'game':
        const myAnswer = gameRounds.find(r => r.question === currentQuestion)?.answers[me.id];
        const partnerAnswered = partner && gameRounds.find(r => r.question === currentQuestion)?.answers[partner.id];
        
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
                        disabled={isLoading || !!myAnswer}
                    />
                    <Button onClick={handleSubmitAnswer} className="w-full mt-6" size="lg" disabled={isLoading || !currentAnswer.trim() || !!myAnswer}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : myAnswer ? 'Waiting for partner...' : 'Submit Answer'}
                    </Button>

                    {myAnswer && !partnerAnswered && (
                      <p className="text-center text-muted-foreground text-sm mt-4 animate-pulse">Waiting for your partner to answer...</p>
                    )}
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
                <div className="flex items-center gap-4">
                  {players.length > 1 && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="w-5 h-5" />
                      <span>{players.length} / 2</span>
                    </div>
                  )}
                  {step !== 'lobby' && <Progress value={progress} className="w-32 sm:w-64" />}
                </div>
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
                {renderStepContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
  );
}

    