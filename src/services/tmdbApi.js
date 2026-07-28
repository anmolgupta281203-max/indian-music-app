import axios from 'axios';

// Using a reliable TMDB key
const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const BASE_URL = '/api/tmdb';

export const getTrendingMovies = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`);
    return res.data.results;
  } catch (err) {
    console.error('Error fetching trending movies', err);
    return [];
  }
};

export const getPopularSeries = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    return res.data.results;
  } catch (err) {
    console.error('Error fetching popular series', err);
    return [];
  }
};

export const getPopularHindiMovies = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=hi&sort_by=popularity.desc&page=1`);
    return res.data.results;
  } catch (err) {
    console.error('Error fetching hindi movies', err);
    return [];
  }
};

export const getPopularHindiSeries = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_original_language=hi&sort_by=popularity.desc&page=1`);
    return res.data.results;
  } catch (err) {
    console.error('Error fetching hindi series', err);
    return [];
  }
};

export const getTrendingAnime = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&page=1&with_genres=16&with_original_language=ja`);
    return res.data.results;
  } catch (err) {
    console.error('Error fetching trending anime', err);
    return [];
  }
};

export const searchMoviesAndSeries = async (query) => {
  try {
    const res = await axios.get(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`);
    // Filter out people, keep only movies and tv
    return res.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (err) {
    console.error('Error searching tmdb', err);
    return [];
  }
};

export const getSeriesDetails = async (seriesId) => {
  try {
    const res = await axios.get(`${BASE_URL}/tv/${seriesId}?api_key=${TMDB_API_KEY}&language=en-US`);
    return res.data;
  } catch (err) {
    console.error('Error fetching series details', err);
    return null;
  }
};

export const getSeasonDetails = async (seriesId, seasonNumber) => {
  try {
    const res = await axios.get(`${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`);
    return res.data;
  } catch (err) {
    console.error('Error fetching season details', err);
    return null;
  }
};

export const discoverByGenre = async (genreId) => {
  try {
    // We fetch a mix of both movies and tv by genre by doing two requests
    const [movies, tv] = await Promise.all([
      axios.get(`${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`),
      axios.get(`${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`)
    ]);
    const m = movies.data.results.map(item => ({ ...item, media_type: 'movie' }));
    const t = tv.data.results.map(item => ({ ...item, media_type: 'tv' }));
    // Interleave them
    const mixed = [];
    const maxLen = Math.max(m.length, t.length);
    for(let i = 0; i < maxLen; i++) {
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
    const res = await axios.get(`${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_networks=${networkId}&sort_by=popularity.desc&page=1`);
    return res.data.results.map(item => ({ ...item, media_type: 'tv' }));
  } catch (err) {
    console.error('Error fetching by network', err);
    return [];
  }
};

export const getImageUrl = (path, size = 'w500') => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};
