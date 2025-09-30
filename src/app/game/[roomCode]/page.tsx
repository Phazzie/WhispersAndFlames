
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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CATEGORIES, SPICY_LEVELS, type Category, type SpicyLevel } from '@/lib/constants';
import { generateQuestionAction, analyzeAndSummarizeAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, ClipboardCopy, PartyPopper, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type GameStep = 'lobby' | 'categories' | 'spicy' | 'game' | 'summary';
type Player = { id: string; name: string; isReady: boolean; email: string; selectedCategories: string[], selectedSpicyLevel?: SpicyLevel['name'] };
type GameRound = { question: string; answers: Record<string, string> };
type GameState = {
  step: GameStep;
  players: Player[];
  hostId: string;
  commonCategories: string[];
  finalSpicyLevel: SpicyLevel['name'];
  gameRounds: GameRound[];
  currentQuestion: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  summary: string;
  completedAt?: Date;
};
const QUESTIONS_PER_CATEGORY = 2;
const LOADING_MESSAGES = [
    "Fanning the flames...",
    "Crafting the perfect question...",
    "Stoking the embers of connection...",
    "Translating whispers into words...",
    "Finding the right spark...",
];

function LoadingScreen({ message }: { message?: string }) {
    const [loadingMessage, setLoadingMessage] = useState(message || LOADING_MESSAGES[0]);

    useEffect(() => {
        if (message) return;
        const interval = setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = LOADING_MESSAGES.indexOf(prev);
                const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
                return LOADING_MESSAGES[nextIndex];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [message]);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-lg animate-pulse">{loadingMessage}</p>
      </div>
    );
}

export default function GamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push(`/?join=${roomCode}`);
      }
    });
    return () => unsubscribe();
  }, [router, roomCode]);


  useEffect(() => {
    if (!roomCode || !currentUser) return;

    const roomRef = doc(db, 'games', roomCode);

    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        
        const currentUserInGame = data.players.find(p => p.id === currentUser.uid);
        if (data.players.length < 2 && !currentUserInGame) {
          const newPlayerName = `Player ${data.players.length + 1}`;
          const newPlayer: Player = { id: currentUser.uid, name: newPlayerName, isReady: false, email: currentUser.email!, selectedCategories: [] };
          await updateDoc(roomRef, { players: [...data.players, newPlayer] });
          setPlayerName(newPlayerName);
        } else if (currentUserInGame) {
            setPlayerName(currentUserInGame.name);
        }
        setGameState(data);
      } else {
        const user = auth.currentUser;
        if (user) {
            const newPlayerName = 'Player 1';
            const newGame: GameState = {
              step: 'lobby',
              players: [{ id: user.uid, name: newPlayerName, isReady: false, email: user.email!, selectedCategories: [] }],
              hostId: user.uid,
              commonCategories: [],
              finalSpicyLevel: 'Mild',
              gameRounds: [],
              currentQuestion: '',
              currentQuestionIndex: 0,
              totalQuestions: 0,
              summary: '',
            };
            await setDoc(roomRef, newGame);
            setGameState(newGame);
            setPlayerName(newPlayerName);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [roomCode, currentUser]);
  
  const me = useMemo(() => gameState?.players.find(p => p.id === currentUser?.uid), [gameState, currentUser]);
  const partner = useMemo(() => gameState?.players.find(p => p.id !== currentUser?.uid), [gameState, currentUser]);

  const progress = useMemo(() => {
    if (!gameState) return 0;
    const { step, currentQuestionIndex, totalQuestions } = gameState;
    if (step === 'summary') return 100;
    if (step === 'game' && totalQuestions > 0) return ((currentQuestionIndex) / totalQuestions) * 100;
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
    await updateDoc(roomRef, newState as any);
  };

  const handleNameChange = async () => {
    if (!me || !gameState || !playerName.trim()) return;
    if (me.name === playerName.trim()) return;

    const updatedPlayers = gameState.players.map(p =>
      p.id === me.id ? { ...p, name: playerName.trim() } : p
    );
    await updateGameState({ players: updatedPlayers });
    toast({ title: 'Name updated!', description: `You are now known as ${playerName.trim()}`});
  };
  
  const handleToggleCategory = async (categoryName: string) => {
    if (!me || !gameState || me.isReady) return;
    const myCurrentCategories = me.selectedCategories || [];
    const newCategories = myCurrentCategories.includes(categoryName)
        ? myCurrentCategories.filter((c) => c !== categoryName)
        : [...myCurrentCategories, categoryName];

    const updatedPlayers = gameState.players.map(p =>
        p.id === me.id ? { ...p, selectedCategories: newCategories } : p
    );
    await updateGameState({ players: updatedPlayers });
  };
  
  const handlePlayerReady = async (step: GameStep) => {
    if (!me || !gameState) return;
    
    await handleNameChange();

    const roomRef = doc(db, 'games', roomCode);
    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as GameState;

    // Mark current player as ready
    const updatedPlayers = currentGameState.players.map(p => p.id === me.id ? {...p, isReady: true} : p);
    await updateGameState({ players: updatedPlayers });
    const bothPlayersReady = updatedPlayers.every(p => p.isReady);

    if (bothPlayersReady) {
        let nextStep: GameStep = currentGameState.step;
        let resetReadyStatus = true;

        if (step === 'lobby') {
            nextStep = 'categories';
        } else if (step === 'categories') {
            const p1 = updatedPlayers.find(p => p.id === me.id);
            const p2 = updatedPlayers.find(p => p.id !== me.id);
            if (p1 && p2) {
                const commonCategories = p1.selectedCategories.filter(c => p2.selectedCategories.includes(c));
                if(commonCategories.length === 0) {
                    toast({ title: "No Common Ground", description: "You and your partner didn't select any common categories. Please discuss and select at least one together.", variant: 'destructive', duration: 5000});
                    const unReadyPlayers = updatedPlayers.map(p => ({...p, isReady: false}));
                    await updateGameState({ players: unReadyPlayers });
                    return;
                }
                const totalQuestions = commonCategories.length * QUESTIONS_PER_CATEGORY;
                await updateGameState({ commonCategories, totalQuestions });
            }
            nextStep = 'spicy';
        }

        const finalPlayers = resetReadyStatus ? updatedPlayers.map(p => ({...p, isReady: false})) : updatedPlayers;
        await updateGameState({ step: nextStep, players: finalPlayers });
    }
  }
  
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

    let updatedGameRounds = [...currentGameState.gameRounds];
    const currentRoundIndex = updatedGameRounds.findIndex(r => r.question === currentGameState.currentQuestion);

    if (currentRoundIndex > -1) {
        updatedGameRounds[currentRoundIndex].answers[me.id] = currentAnswer;
    } else {
        updatedGameRounds.push({
            question: currentGameState.currentQuestion,
            answers: { [me.id]: currentAnswer },
        });
    }

    await updateGameState({ gameRounds: updatedGameRounds });
    
    setCurrentAnswer('');
    setIsLoading(false);
  };

  const handleNextStep = async () => {
    if (!gameState || !me) return;
    
    setIsLoading(true);
    setError(null);

    const roomRef = doc(db, 'games', roomCode);
    
    const updatedPlayers = gameState.players.map(p => p.id === me.id ? { ...p, isReady: true } : p);
    await updateGameState({ players: updatedPlayers });

    const currentDoc = await getDoc(roomRef);
    const currentGameState = currentDoc.data() as GameState;

    if (currentGameState.players.every(p => p.isReady)) {
      const resetPlayers = currentGameState.players.map(p => ({...p, isReady: false}));
      
      if (currentGameState.currentQuestionIndex >= currentGameState.totalQuestions) {
        // Game over
        await updateGameState({ step: 'summary' }); // Move to summary step to show loading screen
        const allAnswers = currentGameState.gameRounds.flatMap(r => Object.values(r.answers));
        const summaryResult = await analyzeAndSummarizeAction({
            questions: currentGameState.gameRounds.map(r => r.question),
            answers: allAnswers,
            categories: currentGameState.commonCategories,
            spicyLevel: currentGameState.finalSpicyLevel,
        });
        if ('summary' in summaryResult) {
            await updateGameState({ players: resetPlayers, summary: summaryResult.summary, completedAt: new Date() });
        } else {
            setError(summaryResult.error);
            toast({ title: 'Summary Error', description: summaryResult.error, variant: 'destructive'});
        }
      } else {
        // Next question
        const nextQuestionIndex = currentGameState.currentQuestionIndex + 1;
        const categoryIndex = Math.floor((nextQuestionIndex - 1) / QUESTIONS_PER_CATEGORY);
        const currentCategory = currentGameState.commonCategories[categoryIndex];

        const result = await generateQuestionAction({
            categories: [currentCategory],
            spicyLevel: currentGameState.finalSpicyLevel,
            previousQuestions: currentGameState.gameRounds.map(r => r.question),
        });

        if ('question' in result) {
            await updateGameState({ players: resetPlayers, currentQuestion: result.question, currentQuestionIndex: nextQuestionIndex });
        } else {
            setError(result.error);
            toast({ title: 'Question Error', description: result.error, variant: 'destructive'});
        }
      }
    }
    setIsLoading(false);
  }

  const handleSpicySelect = async (value: SpicyLevel['name']) => {
    if (!me || !gameState || me.isReady) return;
    
    const roomRef = doc(db, 'games', roomCode);
    
    const updatedPlayers = gameState.players.map(p => 
      p.id === me.id ? { ...p, selectedSpicyLevel: value, isReady: true } : p
    );
    await updateGameState({ players: updatedPlayers });

    const currentDoc = await getDoc(roomRef);
    const refreshedGameState = currentDoc.data() as GameState;

    const bothReady = refreshedGameState.players.every(p => p.isReady);
    
    if (bothReady) {
        const p1 = refreshedGameState.players[0];
        const p2 = refreshedGameState.players[1];
        if (!p1.selectedSpicyLevel || !p2.selectedSpicyLevel) return;

        const p1Level = SPICY_LEVELS.findIndex(l => l.name === p1.selectedSpicyLevel);
        const p2Level = SPICY_LEVELS.findIndex(l => l.name === p2.selectedSpicyLevel);
        const finalLevelIndex = Math.min(p1Level, p2Level);
        const finalSpicyLevel = SPICY_LEVELS[finalLevelIndex].name;
        
        const resetPlayers = refreshedGameState.players.map(p => ({...p, isReady: false}))
        
        await updateGameState({ finalSpicyLevel, players: resetPlayers });
        await startFirstQuestion(finalSpicyLevel, refreshedGameState.commonCategories);
    }
  };

  const startFirstQuestion = async (finalSpicyLevel: SpicyLevel['name'], commonCategories: string[]) => {
    setIsLoading(true);
    setError(null);

    const currentCategory = commonCategories[0];
    const result = await generateQuestionAction({
        categories: [currentCategory],
        spicyLevel: finalSpicyLevel,
        previousQuestions: [],
    });

    if ('question' in result) {
        await updateGameState({ currentQuestion: result.question, step: 'game', currentQuestionIndex: 1 });
    } else {
        setError(result.error);
        toast({
          title: 'Error starting game',
          description: result.error,
          variant: 'destructive',
        })
    }
    setIsLoading(false);
  };
  
  if (isLoading || !gameState || !me) {
      return <LoadingScreen message={isLoading ? undefined : "Setting up your game..."} />;
  }
  
  const { step, players, commonCategories, finalSpicyLevel, currentQuestion, gameRounds, summary, totalQuestions, currentQuestionIndex } = gameState;

  const renderStepContent = (): ReactNode => {
    switch (step) {
      case 'lobby':
        return (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Your Private Room</CardTitle>
              <CardDescription>Share the code, choose your name, and get ready.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 rounded-lg border border-dashed p-4 justify-between">
                <span className="font-mono text-lg font-bold text-primary">{roomCode}</span>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  <ClipboardCopy className="h-5 w-5" />
                </Button>
              </div>

               <div className="space-y-2">
                  <Label htmlFor="playerName">Your Name</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="playerName"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onBlur={handleNameChange}
                      placeholder="Enter your name"
                      disabled={me.isReady}
                    />
                  </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                  <div className="flex flex-col">
                    <span className="font-semibold">{me.name} (You)</span>
                    <span className="text-xs text-muted-foreground">{me.email}</span>
                  </div>
                  {me.isReady ? <span className="text-sm text-green-400">Ready</span> : <span className="text-sm text-amber-400">Waiting...</span>}
                </div>
                {partner ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div className="flex flex-col">
                      <span className="font-semibold">{partner.name}</span>
                      <span className="text-xs text-muted-foreground">{partner.email}</span>
                    </div>
                     {partner.isReady ? <span className="text-sm text-green-400">Ready</span> : <span className="text-sm text-amber-400">Waiting...</span>}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center p-3">Waiting for partner to join...</div>
                )}
              </div>
              <Button onClick={() => handlePlayerReady('lobby')} className="w-full" size="lg" disabled={me.isReady || players.length < 2}>
                {me.isReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for partner...</> : players.length < 2 ? 'Waiting for partner...' : "I'm Ready!"}
              </Button>
            </CardContent>
          </Card>
        );
      case 'categories':
        return (
          <div className="w-full max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-2">Choose Your Categories</h2>
            <p className="text-muted-foreground text-center mb-8">
              Select at least one theme to explore together. Questions will be drawn from categories you both choose.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {CATEGORIES.map((cat) => {
                const isSelectedByMe = me.selectedCategories.includes(cat.name);
                const isSelectedByPartner = partner?.selectedCategories.includes(cat.name);
                const isCommon = isSelectedByMe && isSelectedByPartner;

                return (
                  <Card
                    key={cat.name}
                    onClick={() => handleToggleCategory(cat.name)}
                    className={`transition-all duration-200 cursor-pointer relative overflow-hidden
                      ${me.isReady ? 'cursor-not-allowed opacity-70' : ''}
                      ${isCommon ? 'border-primary ring-2 ring-primary shadow-lg' :
                      isSelectedByMe ? 'border-blue-400 ring-2 ring-blue-400' : 'hover:border-primary/50'}
                    `}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center aspect-square">
                      <cat.icon className={`w-8 h-8 mb-2 ${isSelectedByMe || isSelectedByPartner ? 'text-primary' : ''}`} />
                      <h3 className="font-semibold text-sm">{cat.name}</h3>
                    </CardContent>
                    <div className="absolute bottom-1 right-1 flex gap-1">
                        {isSelectedByMe && <div className="w-2 h-2 rounded-full bg-blue-400" title={`Selected by ${me.name}`}></div>}
                        {partner && isSelectedByPartner && <div className="w-2 h-2 rounded-full bg-green-400" title={`Selected by ${partner.name}`}></div>}
                    </div>
                  </Card>
                )
              })}
            </div>
            
            <Button onClick={() => handlePlayerReady('categories')} className="w-full max-w-xs mx-auto flex" size="lg" disabled={me.isReady || me.selectedCategories.length === 0}>
                {me.isReady ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for partner...</> : 'Confirm Selections'}
            </Button>
            {players.every(p => p.isReady) && <p className="text-center mt-4 text-green-400 animate-pulse">Both players ready! Moving on...</p>}
          </div>
        );
      case 'spicy':
        const mySpicySelection = me?.selectedSpicyLevel;
        const partnerSpicySelection = partner?.selectedSpicyLevel;
        return (
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Set The Mood</h2>
            <p className="text-muted-foreground text-center mb-8">
              Choose your desired level of intensity. The game will use the mildest level chosen by either of you.
            </p>
             <RadioGroup
                value={mySpicySelection}
                onValueChange={handleSpicySelect}
                className="space-y-4"
                disabled={me.isReady}
              >
                {SPICY_LEVELS.map((level) => (
                    <Card key={level.name} className={`has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary`}>
                        <Label htmlFor={level.name} className={`flex items-start space-x-4 p-4 cursor-pointer ${me.isReady ? 'cursor-not-allowed' : ''}`}>
                            <RadioGroupItem value={level.name} id={level.name} className="mt-1"/>
                            <div className="flex-1">
                                <h3 className="font-semibold">{level.name}</h3>
                                <p className="text-muted-foreground text-sm">{level.description}</p>
                            </div>
                        </Label>
                    </Card>
                ))}
             </RadioGroup>
             {(me.isReady || partner?.isReady) && (
              <div className='flex justify-around mt-4 p-4 bg-secondary/50 rounded-lg'>
                <div className='text-center'>
                  <p className='font-semibold'>{me.name}'s choice:</p>
                  <p className='text-primary font-bold text-lg'>{mySpicySelection || 'Choosing...'}</p>
                </div>
                 {partner && <div className='text-center'>
                  <p className='font-semibold'>{partner.name}'s choice:</p>
                  <p className='text-primary font-bold text-lg'>{partnerSpicySelection || 'Choosing...'}</p>
                </div>}
              </div>
            )}
             {players.every(p => p.isReady) && (
                <div className="text-center mt-4 space-y-2">
                    <p className="text-muted-foreground">Both players are ready. The game will begin with <span className="font-bold text-primary">{finalSpicyLevel}</span> intensity.</p>
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                </div>
            )}
          </div>
        );
      case 'game':
        const currentRound = gameRounds.find(r => r.question === currentQuestion);
        const myAnswer = currentRound?.answers[me.id];
        const partnerAnswer = partner ? currentRound?.answers[partner.id] : undefined;
        const bothAnswered = !!myAnswer && (players.length === 1 || !!partnerAnswer);

        if (isLoading && !bothAnswered) {
            return <LoadingScreen />;
        }

        if (bothAnswered) {
          // Both players have answered, show the reveal view.
          return (
            <div className="w-full max-w-2xl">
              <p className="text-center text-primary font-semibold mb-4">Question {currentQuestionIndex} of {totalQuestions}</p>
              <Card>
                <CardHeader>
                  <blockquote className="text-center text-2xl font-semibold leading-relaxed font-headline">
                    “{currentQuestion}”
                  </blockquote>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-base">{me.name}'s Answer:</Label>
                    <p className="p-4 bg-secondary rounded-md whitespace-pre-wrap">{myAnswer}</p>
                  </div>
                  {partner && (
                    <div className="space-y-2">
                      <Label className="font-semibold text-base">{partner.name}'s Answer:</Label>
                      <p className="p-4 bg-secondary rounded-md whitespace-pre-wrap">{partnerAnswer}</p>
                    </div>
                  )}
                  <Button onClick={handleNextStep} className="w-full" size="lg" disabled={isLoading || me.isReady}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : me.isReady ? 'Waiting for partner...' : (currentQuestionIndex >= totalQuestions ? 'See Summary' : 'Next Question')}
                     {!me.isReady && (currentQuestionIndex < totalQuestions) && <ArrowRight className="ml-2" />}
                  </Button>
                  {me.isReady && partner && !partner.isReady && <p className="text-center text-sm text-muted-foreground mt-2 animate-pulse">Waiting for {partner.name} to continue...</p>}
                </CardContent>
              </Card>
            </div>
          );
        }

        // Default view: answering the question
        return (
          <div className="w-full max-w-xl">
            <p className="text-center text-primary font-semibold mb-4">Question {currentQuestionIndex} of {totalQuestions}</p>
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

                    {myAnswer && (!partner || !partnerAnswer) && (
                      <p className="text-center text-muted-foreground text-sm mt-4 animate-pulse">Waiting for your partner to answer...</p>
                    )}
                </CardContent>
            </Card>
          </div>
        );
      case 'summary':
        if (!summary) {
            return <LoadingScreen message="Ember is analyzing your answers..." />;
        }
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
                      <Button onClick={() => router.push('/profile')} className="w-full mt-6" size="lg">
                        View My History
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
                key={step + (step === 'game' ? (gameRounds.find(r=>r.question === currentQuestion)?.answers[me?.id] && gameRounds.find(r=>r.question === currentQuestion)?.answers[partner?.id || ''] ? 'reveal' : 'answer') : '')}
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
