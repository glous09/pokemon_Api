const POKEMON_LIST_ENDPOINT = "https://pokeapi.co/api/v2/pokemon?limit=50&offset=0";

async function fetchPokemonList(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
}

function formatPokemonName(name) {
    if (typeof name !== "string" || name.length === 0) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function renderPokemonCards(pokemonList) {
    const container = document.getElementById("pokemon-list");
    if (!container) return;
    container.textContent = "";

    for (const pokemon of pokemonList) {
        const name = formatPokemonName(pokemon?.name ?? "");
        const url = pokemon?.url ?? "#";

        const col = document.createElement("div");
        col.className = "col-6 col-md-4 col-lg-3 mb-3";

        col.innerHTML = `
            <div class="card h-100">
                <div class="card-body position-relative">
                    <h2 class="h6 card-title mb-0">${name}</h2>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="stretched-link"></a>
                </div>
            </div>
        `;

        container.appendChild(col);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const list = await fetchPokemonList(POKEMON_LIST_ENDPOINT);
        if (list.length === 0) {
            const container = document.getElementById("pokemon-list");
            if (container) container.textContent = "No se encontraron Pokémon";
            return;
        }
        renderPokemonCards(list);
    } catch (error) {
        const container = document.getElementById("pokemon-list");
        if (container) container.textContent = "Error al cargar los Pokémon";
    }
});
