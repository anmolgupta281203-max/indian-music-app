import axios from 'axios';

// All TMDB calls go through our serverless proxy at /api/tmdb/*
// The proxy adds the API key server-side so it's never exposed to the client
const BASE_URL = '/api/tmdb';

const SOAP_BLACKLIST = [
  'c.i.d', 'cid', 'taarak mehta', 'crime patrol', 'savdhaan india', 
  'anupamaa', 'yeh rishta', 'kumkum bhagya', 'kundali bhagya', 'naagin', 
  'bigg boss', 'indian idol', 'the kapil sharma show', 'sasural simar ka', 
  'imlie', 'gum hai kisi ke', 'radha krishn', 'balika vadhu', 
  'saath nibhaana', 'diya aur baati', 'kahaani ghar ghar', 'tarak mehta',
  'khatron ke khiladi', 'dance india dance', 'jhalak dikhhla jaa', 'super dancer',
  'roadies', 'splitsvilla', 'kaun banega crorepati'
];

export const filterOnlyWebSeries = (items = []) => {
  return items.filter(item => {
    if (!item) return false;
    const name = (item.name || item.title || '').toLowerCase();
    if (SOAP_BLACKLIST.some(b => name.includes(b))) return false;
    if (item.genre_ids && Array.isArray(item.genre_ids)) {
      if (item.genre_ids.includes(10766) || item.genre_ids.includes(10767) || item.genre_ids.includes(10763)) {
        return false;
      }
    }
    return true;
  });
};

export const getTrendingMovies = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/trending/movie/day`);
    return res.data.results || [];
  } catch (err) {
    console.error('Error fetching trending movies', err);
    return [];
  }
};

export const getPopularSeries = async () => {
  try {
    // Top OTT Web Series (excluding TV daily soaps)
    const res = await axios.get(`${BASE_URL}/discover/tv?with_networks=213|1024|2739|2552|49|4330|3919&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`);
    return filterOnlyWebSeries(res.data.results || []);
  } catch (err) {
    console.error('Error fetching popular series', err);
    return [];
  }
};

export const getPopularHindiMovies = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/movie?with_original_language=hi&sort_by=popularity.desc&page=1`);
    return res.data.results || [];
  } catch (err) {
    console.error('Error fetching hindi movies', err);
    return [];
  }
};

export const getPopularHindiSeries = async () => {
  try {
    // Hindi OTT Web Series (Netflix, Amazon Prime, Hotstar, JioCinema, Zee5, Sony LIV)
    const res = await axios.get(`${BASE_URL}/discover/tv?with_original_language=hi&with_networks=213|1024|2739|4330|3919|2552|384&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`);
    let results = filterOnlyWebSeries(res.data.results || []);
    
    // If networks filter returned few results, fallback to general hindi TV without soap genres
    if (results.length < 5) {
      const fallbackRes = await axios.get(`${BASE_URL}/discover/tv?with_original_language=hi&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`);
      results = filterOnlyWebSeries(fallbackRes.data.results || []);
    }
    return results;
  } catch (err) {
    console.error('Error fetching hindi series', err);
    return [];
  }
};

export const getTrendingAnime = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/tv?language=en-US&sort_by=popularity.desc&page=1&with_genres=16&with_original_language=ja`);
    return filterOnlyWebSeries(res.data.results || []);
  } catch (err) {
    console.error('Error fetching trending anime', err);
    return [];
  }
};

export const searchMoviesAndSeries = async (query) => {
  try {
    const res = await axios.get(`${BASE_URL}/search/multi?language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
    const list = (res.data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
    return filterOnlyWebSeries(list);
  } catch (err) {
    console.error('Error searching tmdb', err);
    return [];
  }
};

export const getSeriesDetails = async (seriesId) => {
  try {
    const res = await axios.get(`${BASE_URL}/tv/${seriesId}?language=en-US`);
    return res.data;
  } catch (err) {
    console.error('Error fetching series details', err);
    return null;
  }
};

export const getSeasonDetails = async (seriesId, seasonNumber) => {
  try {
    const res = await axios.get(`${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?language=en-US`);
    return res.data;
  } catch (err) {
    console.error('Error fetching season details', err);
    return null;
  }
};

export const discoverByGenre = async (genreId) => {
  try {
    const [movies, tv] = await Promise.all([
      axios.get(`${BASE_URL}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=1`),
      axios.get(`${BASE_URL}/discover/tv?with_genres=${genreId}&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`)
    ]);
    const m = (movies.data.results || []).map(item => ({ ...item, media_type: 'movie' }));
    const t = filterOnlyWebSeries(tv.data.results || []).map(item => ({ ...item, media_type: 'tv' }));
    const mixed = [];
    const maxLen = Math.max(m.length, t.length);
    for (let i = 0; i < maxLen; i++) {
      if (m[i]) mixed.push(m[i]);
      if (t[i]) mixed.push(t[i]);
    }
    return mixed;
  } catch (err) {
    console.error('Error fetching by genre', err);
    return [];
  }
};

export const discoverByNetwork = async (networkId) => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/tv?with_networks=${networkId}&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`);
    const filtered = filterOnlyWebSeries(res.data.results || []);
    return filtered.map(item => ({ ...item, media_type: 'tv' }));
  } catch (err) {
    console.error('Error fetching by network', err);
    return [];
  }
};

export const getPopularEnglishMovies = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/movie?with_original_language=en&sort_by=popularity.desc&page=1`);
    return res.data.results || [];
  } catch (err) {
    console.error('Error fetching english movies', err);
    return [];
  }
};

export const getPopularEnglishSeries = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/tv?with_original_language=en&with_networks=213|1024|2739|2552|49&without_genres=10766,10767,10763,10764&sort_by=popularity.desc&page=1`);
    return filterOnlyWebSeries(res.data.results || []);
  } catch (err) {
    console.error('Error fetching english series', err);
    return [];
  }
};

export const discoverByLanguage = async (langCode = 'hi') => {
  try {
    const isHindi = langCode === 'hi';
    const [movies, tv] = await Promise.all([
      isHindi ? getPopularHindiMovies() : getPopularEnglishMovies(),
      isHindi ? getPopularHindiSeries() : getPopularEnglishSeries()
    ]);
    const m = (movies || []).map(item => ({ ...item, media_type: 'movie' }));
    const t = (tv || []).map(item => ({ ...item, media_type: 'tv' }));
    const mixed = [];
    const maxLen = Math.max(m.length, t.length);
    for (let i = 0; i < maxLen; i++) {
      if (m[i]) mixed.push(m[i]);
      if (t[i]) mixed.push(t[i]);
    }
    return mixed;
  } catch (err) {
    console.error('Error fetching by language', err);
    return [];
  }
};

export const getImageUrl = (path, size = 'w500') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};
