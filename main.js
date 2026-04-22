const POKEMON_LIST_ENDPOINT = "https://pokeapi.co/api/v2/pokemon?limit=50&offset=0";

async function fetchPokemonList(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data?.results) ? data.results : [];
}

async function fetchPokemonDetails(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    const data = await response.json();

    const abilities = Array.isArray(data?.abilities) ? data.abilities : [];
    const abilityNames = abilities
        .map((a) => a?.ability?.name)
        .filter((name) => typeof name === "string" && name.length > 0);

    const image =
        data?.sprites?.other?.["official-artwork"]?.front_default ??
        data?.sprites?.front_default ??
        "";

    const typeNames = Array.isArray(data?.types)
        ? data.types
              .map((t) => t?.type?.name)
              .filter((name) => typeof name === "string" && name.length > 0)
        : [];

    return { abilityNames, image, typeNames };
}

function formatPokemonName(name) {
    if (typeof name !== "string" || name.length === 0) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
    return String(value).replaceAll('"', "&quot;");
}

function renderAbilityBadges(abilities) {
    if (!Array.isArray(abilities) || abilities.length === 0) {
        return `<span class="text-muted">Sin abilities</span>`;
    }
    return abilities
        .map((a) => `<span class="badge bg-secondary me-1 mb-1">${escapeHtml(a)}</span>`)
        .join("");
}

function getCardThemeByType(typeName) {
    const themes = {
        fire: { background: "linear-gradient(135deg, #ffe259 0%, #ffa751 45%, #ff512f 100%)", color: "#1f1400" },
        water: { background: "linear-gradient(135deg, #6dd5fa 0%, #2980b9 100%)", color: "#06121c" },
        grass: { background: "linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)", color: "#0b1a05" },
        electric: { background: "linear-gradient(135deg, #fceabb 0%, #f8b500 100%)", color: "#1a1200" },
        ice: { background: "linear-gradient(135deg, #e0f7ff 0%, #7fdbff 100%)", color: "#04151c" },
        psychic: { background: "linear-gradient(135deg, #fbd3e9 0%, #bb377d 100%)", color: "#1a0610" },
        dragon: { background: "linear-gradient(135deg, #cfd9df 0%, #e2ebf0 40%, #6a85b6 100%)", color: "#0b0f1a" },
        dark: { background: "linear-gradient(135deg, #232526 0%, #414345 100%)", color: "#ffffff" },
        fairy: { background: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)", color: "#1a0b14" },
        fighting: { background: "linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)", color: "#1a0d00" },
        flying: { background: "linear-gradient(135deg, #dfe9f3 0%, #ffffff 60%, #cfd9df 100%)", color: "#0c1016" },
        poison: { background: "linear-gradient(135deg, #cc2b5e 0%, #753a88 100%)", color: "#ffffff" },
        ground: { background: "linear-gradient(135deg, #d1913c 0%, #ffd194 100%)", color: "#1a0f00" },
        rock: { background: "linear-gradient(135deg, #c2b280 0%, #8e8d8a 100%)", color: "#14110b" },
        bug: { background: "linear-gradient(135deg, #dce35b 0%, #45b649 100%)", color: "#0b1a06" },
        ghost: { background: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)", color: "#120818" },
        steel: { background: "linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)", color: "#0b1016" },
        normal: { background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", color: "#0c1016" },
    };

    return themes[typeName] ?? { background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", color: "#0c1016" };
}

function setPokemonCardTheme(pokemonNameKey, typeName) {
    const card = document.querySelector(`[data-card-for="${CSS.escape(pokemonNameKey)}"]`);
    if (!card) return;

    const theme = getCardThemeByType(typeName);
    card.style.background = theme.background;
    card.style.color = theme.color;
    card.style.border = "none";
}

function renderPokemonCards(pokemonList) {
    const container = document.getElementById("pokemon-list");
    if (!container) return;
    container.textContent = "";

    for (const pokemon of pokemonList) {
        const name = formatPokemonName(pokemon?.name ?? "");
        const url = pokemon?.url ?? "#";
        const key = pokemon?.name ?? "";

        const col = document.createElement("div");
        col.className = "col-6 col-md-4 col-lg-3 mb-3";

        col.innerHTML = `
            <div class="card h-100" data-card-for="${escapeAttribute(key)}">
                <img
                    data-img-for="${escapeAttribute(key)}"
                    class="card-img-top p-3"
                    style="height: 140px; object-fit: contain;"
                    alt="${escapeAttribute(name)}"
                />
                <div class="card-body position-relative">
                    <h2 class="h6 card-title mb-0">${escapeHtml(name)}</h2>
                    <div class="mt-2" data-abilities-for="${escapeAttribute(key)}">
                        <span class="text-muted">Cargando abilities...</span>
                    </div>
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="stretched-link"></a>
                </div>
            </div>
        `;

        container.appendChild(col);
    }
}

function setPokemonAbilities(pokemonNameKey, abilities) {
    const el = document.querySelector(`[data-abilities-for="${CSS.escape(pokemonNameKey)}"]`);
    if (!el) return;
    el.innerHTML = renderAbilityBadges(abilities);
}

function setPokemonImage(pokemonNameKey, imageUrl) {
    const img = document.querySelector(`[data-img-for="${CSS.escape(pokemonNameKey)}"]`);
    if (!img) return;
    if (typeof imageUrl === "string" && imageUrl.length > 0) {
        img.src = imageUrl;
        img.loading = "lazy";
        img.decoding = "async";
        return;
    }
    img.remove();
}

async function runWithConcurrency(items, concurrency, worker) {
    const executing = new Set();

    for (const item of items) {
        const p = Promise.resolve().then(() => worker(item));
        executing.add(p);
        p.finally(() => executing.delete(p));

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
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

        await runWithConcurrency(list, 10, async (pokemon) => {
            const key = pokemon?.name ?? "";
            const url = pokemon?.url ?? "";
            if (!key || !url) return;

            try {
                const details = await fetchPokemonDetails(url);
                setPokemonAbilities(key, details.abilityNames);
                setPokemonImage(key, details.image);
                setPokemonCardTheme(key, details.typeNames?.[0] ?? "normal");
            } catch (error) {
                setPokemonAbilities(key, []);
                setPokemonImage(key, "");
                setPokemonCardTheme(key, "normal");
            }
        });
    } catch (error) {
        const container = document.getElementById("pokemon-list");
        if (container) container.textContent = "Error al cargar los Pokémon";
    }
});
