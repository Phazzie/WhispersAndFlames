<script lang="ts">
	import type { GameSeam, Category } from '$contracts/Game';

	export let game: GameSeam;

	const categories: Category[] = [
		'Hidden Attractions',
		'Power Play',
		'Fantasy Confessions',
		'Emotional Intimacy',
		'Sensory Exploration',
		'Public/Private',
		'Roleplay & Scenarios'
	];

	let selectedCategories: Category[] = [];

	function toggleCategory(category: Category) {
		if (selectedCategories.includes(category)) {
			selectedCategories = selectedCategories.filter(c => c !== category);
		} else {
			selectedCategories = [...selectedCategories, category];
		}
	}

	function submitCategories() {
		// TODO: Implement category submission
		console.log('Selected categories:', selectedCategories);
	}
</script>

<div class="flex items-center justify-center min-h-screen p-4">
	<div class="max-w-4xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<h1 class="text-4xl font-bold text-white text-center mb-4">Choose Your Categories</h1>
		<p class="text-center text-white/70 mb-8">Select 2-3 categories you'd like to explore</p>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
			{#each categories as category}
				<button
					on:click={() => toggleCategory(category)}
					class="p-6 rounded-lg border-2 transition {
						selectedCategories.includes(category)
							? 'bg-pink-600/30 border-pink-500'
							: 'bg-white/5 border-white/30 hover:border-white/50'
					}"
				>
					<h3 class="text-xl font-semibold text-white mb-2">{category}</h3>
				</button>
			{/each}
		</div>

		<button
			on:click={submitCategories}
			disabled={selectedCategories.length < 2}
			class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
		>
			Continue ({selectedCategories.length} selected)
		</button>
	</div>
</div>
