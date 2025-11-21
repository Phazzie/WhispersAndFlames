<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import type { GameSeam } from '$contracts/Game';

	import Lobby from './components/Lobby.svelte';
	import Categories from './components/Categories.svelte';
	import SpicyLevel from './components/SpicyLevel.svelte';
	import QuestionRound from './components/QuestionRound.svelte';
	import Summary from './components/Summary.svelte';

	let game: GameSeam | null = null;
	let isLoading = true;
	let error: string | null = null;

	const roomCode = $page.params.roomCode;

	onMount(async () => {
		// TODO: Load game data and subscribe to updates
		console.log('Loading game:', roomCode);
		isLoading = false;
	});

	onDestroy(() => {
		// TODO: Unsubscribe from game updates
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900">
	{#if isLoading}
		<div class="flex items-center justify-center h-screen">
			<p class="text-white text-xl">Loading...</p>
		</div>
	{:else if error}
		<div class="flex items-center justify-center h-screen">
			<p class="text-red-400 text-xl">{error}</p>
		</div>
	{:else if game}
		{#if game.step === 'lobby'}
			<Lobby {game} />
		{:else if game.step === 'categories'}
			<Categories {game} />
		{:else if game.step === 'spicy'}
			<SpicyLevel {game} />
		{:else if game.step === 'game'}
			<QuestionRound {game} />
		{:else if game.step === 'summary'}
			<Summary {game} />
		{/if}
	{:else}
		<div class="flex items-center justify-center h-screen">
			<p class="text-white text-xl">Game not found</p>
		</div>
	{/if}
</div>
