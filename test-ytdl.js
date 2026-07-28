import ytdl from '@distube/ytdl-core';
const videoId = 'dQw4w9WgXcQ';
const info = await ytdl.getInfo(videoId);
const format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo' });
console.log(format);
