const DITTO_ENDPOINT = "https://pokeapi.co/api/v2/pokemon/ditto";

async function fetchPokemonName(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    const data = await response.json();
    return data?.name ?? "";
}

function setPokemonName(text) {
    const el = document.getElementById("pokemon-name");
    if (!el) return;
    el.textContent = text;
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const name = await fetchPokemonName(DITTO_ENDPOINT);
        setPokemonName(name || "No se encontró el nombre");
    } catch (error) {
        setPokemonName("Error al cargar el Pokémon");
    }
});
