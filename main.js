const POKEMON_LIST_ENDPOINT = "https://pokeapi.co/api/v2/pokemon?limit=100&offset=0";

const state = {
    nameQuery: "",
    type: "",
    abilityQuery: "",
    evolution: "",
};

const pokemonList = [];
const pokemonDetailsByName = new Map();
const pokemonEvolutionByName = new Map();
const evolutionChainCacheByUrl = new Map();
const evolutionInFlightByName = new Set();
const seenTypes = new Set();

function normalizeText(value) {
    return String(value).trim().toLowerCase();
}

function fetchJson(url) {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
    });
}

async function fetchPokemonList(url) {
    const data = await fetchJson(url);
    return Array.isArray(data?.results) ? data.results : [];
}

async function fetchPokemonDetails(url) {
    const data = await fetchJson(url);

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

    const speciesUrl = data?.species?.url ?? "";

    return { abilityNames, image, typeNames, speciesUrl };
}

function formatPokemonName(name) {
    if (typeof name !== "string" || name.length === 0) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function appendAbilityBadges(container, abilities) {
    container.replaceChildren();

    if (!Array.isArray(abilities) || abilities.length === 0) {
        const muted = document.createElement("span");
        muted.className = "text-muted";
        muted.textContent = "Sin abilities";
        container.appendChild(muted);
        return;
    }

    for (const ability of abilities) {
        const badge = document.createElement("span");
        badge.className = "badge bg-secondary me-1 mb-1";
        badge.textContent = ability;
        container.appendChild(badge);
    }
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

function renderPokemonCards(items) {
    const container = document.getElementById("pokemon-list");
    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(items) || items.length === 0) {
        container.textContent = "No hay resultados";
        return;
    }

    for (const item of items) {
        const nameKey = item?.name ?? "";
        if (!nameKey) continue;

        const details = pokemonDetailsByName.get(nameKey);
        const evo = pokemonEvolutionByName.get(nameKey);
        const displayName = formatPokemonName(nameKey);
        const href = typeof item?.url === "string" && item.url.length > 0 ? item.url : "#";

        const typeName = details?.typeNames?.[0] ?? "normal";
        const theme = getCardThemeByType(typeName);

        const col = document.createElement("div");
        col.className = "col-6 col-md-4 col-lg-3 mb-3";

        const card = document.createElement("div");
        card.className = "card h-100";
        card.style.background = theme.background;
        card.style.color = theme.color;
        card.style.border = "none";

        const imgWrap = document.createElement("div");
        imgWrap.className = "pokemon-img-wrap";

        const img = document.createElement("img");
        img.className = "pokemon-img";
        img.alt = displayName;
        if (typeof details?.image === "string" && details.image.length > 0) {
            img.src = details.image;
            img.loading = "lazy";
            img.decoding = "async";
        } else {
            img.style.opacity = "0";
        }

        imgWrap.appendChild(img);

        const body = document.createElement("div");
        body.className = "card-body position-relative";

        const title = document.createElement("h2");
        title.className = "h6 card-title mb-0";
        title.textContent = displayName;

        const abilitiesContainer = document.createElement("div");
        abilitiesContainer.className = "mt-2";
        if (details) {
            appendAbilityBadges(abilitiesContainer, details.abilityNames);
        } else {
            const muted = document.createElement("span");
            muted.className = "text-muted";
            muted.textContent = "Cargando abilities...";
            abilitiesContainer.appendChild(muted);
        }

        const evoText = evo?.chainText ?? "";
        if (evoText) {
            const evoLine = document.createElement("div");
            evoLine.className = "mt-2 small";
            evoLine.textContent = evoText;
            body.appendChild(evoLine);
        }

        const link = document.createElement("a");
        link.className = "stretched-link";
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        body.appendChild(title);
        body.appendChild(abilitiesContainer);
        body.appendChild(link);

        card.appendChild(imgWrap);
        card.appendChild(body);
        col.appendChild(card);
        container.appendChild(col);
    }
}

function setTypeOptionsFromDetails(details) {
    const select = document.getElementById("filter-type");
    if (!select) return;

    for (const typeName of details?.typeNames ?? []) {
        if (seenTypes.has(typeName)) continue;
        seenTypes.add(typeName);

        const option = document.createElement("option");
        option.value = typeName;
        option.textContent = formatPokemonName(typeName);
        select.appendChild(option);
    }
}

function buildEvolutionMapFromChainNode(node, stage, map) {
    const name = node?.species?.name ?? "";
    if (name) {
        map.set(name, {
            stage,
            isFinal: Array.isArray(node?.evolves_to) ? node.evolves_to.length === 0 : true,
        });
    }

    const children = Array.isArray(node?.evolves_to) ? node.evolves_to : [];
    for (const child of children) {
        buildEvolutionMapFromChainNode(child, stage + 1, map);
    }
}

function buildEvolutionStages(chainNode) {
    const stages = [];
    const queue = [{ node: chainNode, depth: 0 }];

    while (queue.length > 0) {
        const current = queue.shift();
        const node = current?.node;
        const depth = current?.depth ?? 0;

        const name = node?.species?.name ?? "";
        if (name) {
            if (!Array.isArray(stages[depth])) stages[depth] = [];
            if (!stages[depth].includes(name)) stages[depth].push(name);
        }

        const children = Array.isArray(node?.evolves_to) ? node.evolves_to : [];
        for (const child of children) {
            queue.push({ node: child, depth: depth + 1 });
        }
    }

    return stages.filter((s) => Array.isArray(s) && s.length > 0);
}

function formatEvolutionChainText(stages) {
    if (!Array.isArray(stages) || stages.length === 0) return "";
    return stages
        .map((stage) => (Array.isArray(stage) ? stage.join(" / ") : ""))
        .filter((s) => s.length > 0)
        .join(" → ");
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

async function ensureEvolutionInfoFor(items) {
    const need = [];

    for (const item of items) {
        const nameKey = item.name;
        if (pokemonEvolutionByName.has(nameKey)) continue;
        if (evolutionInFlightByName.has(nameKey)) continue;

        const details = pokemonDetailsByName.get(nameKey);
        const speciesUrl = details?.speciesUrl ?? "";
        if (!speciesUrl) continue;

        evolutionInFlightByName.add(nameKey);
        need.push({ nameKey, speciesUrl });
    }

    if (need.length === 0) return;

    await runWithConcurrency(need, 6, async ({ nameKey, speciesUrl }) => {
        try {
            const species = await fetchJson(speciesUrl);
            const chainUrl = species?.evolution_chain?.url ?? "";
            if (!chainUrl) {
                pokemonEvolutionByName.set(nameKey, { hasEvolution: false, isFinal: true, stage: 1, chainText: "" });
                scheduleRender();
                return;
            }

            let cached = evolutionChainCacheByUrl.get(chainUrl);
            if (!cached) {
                const chainData = await fetchJson(chainUrl);
                const map = new Map();
                buildEvolutionMapFromChainNode(chainData?.chain, 1, map);
                const stages = buildEvolutionStages(chainData?.chain);
                cached = { map, hasEvolution: map.size > 1, chainText: formatEvolutionChainText(stages) };
                evolutionChainCacheByUrl.set(chainUrl, cached);
            }

            const info = cached.map.get(nameKey) ?? { stage: 1, isFinal: true };
            pokemonEvolutionByName.set(nameKey, {
                hasEvolution: cached.hasEvolution,
                isFinal: Boolean(info.isFinal),
                stage: Number(info.stage) || 1,
                chainText: cached.chainText,
            });
            scheduleRender();
        } catch (error) {
            pokemonEvolutionByName.set(nameKey, { hasEvolution: false, isFinal: true, stage: 1, chainText: "" });
            scheduleRender();
        } finally {
            evolutionInFlightByName.delete(nameKey);
        }
    });
}

function getFilteredItems() {
    const nameQuery = normalizeText(state.nameQuery);
    const type = normalizeText(state.type);
    const abilityQuery = normalizeText(state.abilityQuery);
    const evolution = normalizeText(state.evolution);

    return pokemonList.filter((item) => {
        const nameKey = item.name;
        if (nameQuery && !normalizeText(nameKey).includes(nameQuery)) return false;

        const details = pokemonDetailsByName.get(nameKey);
        if (type) {
            const types = details?.typeNames ?? [];
            if (!Array.isArray(types) || !types.includes(type)) return false;
        }

        if (abilityQuery) {
            const abilities = details?.abilityNames ?? [];
            const has = Array.isArray(abilities) && abilities.some((a) => normalizeText(a).includes(abilityQuery));
            if (!has) return false;
        }

        if (evolution) {
            const evo = pokemonEvolutionByName.get(nameKey);
            if (!evo) return false;
            if (evolution === "has") return evo.hasEvolution;
            if (evolution === "none") return !evo.hasEvolution;
            if (evolution === "final") return evo.isFinal;
        }

        return true;
    });
}

let renderScheduled = false;
function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;

    requestAnimationFrame(() => {
        renderScheduled = false;
        const filtered = getFilteredItems();
        renderPokemonCards(filtered);

        if (normalizeText(state.evolution)) {
            ensureEvolutionInfoFor(filtered);
        } else {
            ensureEvolutionInfoFor(filtered.slice(0, 12));
        }
    });
}

function bindFilters() {
    const nameInput = document.getElementById("filter-name");
    const typeSelect = document.getElementById("filter-type");
    const abilityInput = document.getElementById("filter-ability");
    const evolutionSelect = document.getElementById("filter-evolution");

    if (nameInput) {
        nameInput.addEventListener("input", () => {
            state.nameQuery = nameInput.value;
            scheduleRender();
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener("change", () => {
            state.type = typeSelect.value;
            scheduleRender();
        });
    }

    if (abilityInput) {
        abilityInput.addEventListener("input", () => {
            state.abilityQuery = abilityInput.value;
            scheduleRender();
        });
    }

    if (evolutionSelect) {
        evolutionSelect.addEventListener("change", () => {
            state.evolution = evolutionSelect.value;
            scheduleRender();
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        bindFilters();

        const list = await fetchPokemonList(POKEMON_LIST_ENDPOINT);
        pokemonList.length = 0;
        pokemonList.push(...list);

        if (pokemonList.length === 0) {
            const container = document.getElementById("pokemon-list");
            if (container) container.textContent = "No se encontraron Pokémon";
            return;
        }

        scheduleRender();

        await runWithConcurrency(pokemonList, 10, async (pokemon) => {
            const nameKey = pokemon?.name ?? "";
            const url = pokemon?.url ?? "";
            if (!nameKey || !url) return;

            try {
                const details = await fetchPokemonDetails(url);
                pokemonDetailsByName.set(nameKey, details);
                setTypeOptionsFromDetails(details);
                scheduleRender();
            } catch (error) {
                pokemonDetailsByName.set(nameKey, { abilityNames: [], image: "", typeNames: ["normal"], speciesUrl: "" });
                scheduleRender();
            }
        });
    } catch (error) {
        const container = document.getElementById("pokemon-list");
        if (container) container.textContent = "Error al cargar los Pokémon";
    }
});
