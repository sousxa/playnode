
// Nota: Em um ambiente real, você usaria 'import { Server } from "socket.io"'
// Aqui definimos a estrutura para o desenvolvedor backend seguir.

import { roomManager } from './roomManager';
import { generateImpostorContent, generateWhoAmICharacters, generateDilemma } from '../services/geminiService';
import { GameMode } from '../types';

export const setupSocketHandlers = (io: any) => {
  io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', ({ playerName, playerId }: any) => {
      const room = roomManager.createRoom(playerId, playerName);
      socket.join(room.code);
      socket.emit('room-updated', room);
    });

    socket.on('join-room', ({ code, playerName, playerId }: any) => {
      const room = roomManager.joinRoom(code, playerId, playerName);
      if (room) {
        socket.join(code);
        io.to(code).emit('room-updated', room);
      } else {
        socket.emit('error', 'Sala não encontrada');
      }
    });

    socket.on('start-game', async ({ code, mode }: any) => {
      const room = roomManager.getRoom(code);
      if (!room) return;

      let data = {};
      try {
        if (mode === GameMode.IMPOSTOR) {
          const word = await generateImpostorContent('Geral');
          const impostorIndex = Math.floor(Math.random() * room.players.length);
          data = { secretWord: word, impostorId: room.players[impostorIndex].id };
        } else if (mode === GameMode.QUEM_SOU_EU) {
          const chars = await generateWhoAmICharacters(room.players.length, 'Famosos');
          const assignments: any = {};
          room.players.forEach((p, i) => assignments[p.id] = chars[i]);
          data = { assignments };
        } else if (mode === GameMode.DILEMAS) {
          data = await generateDilemma();
        }

        roomManager.updateRoomStatus(code, 'PLAYING', mode, data);
        io.to(code).emit('room-updated', roomManager.getRoom(code));
      } catch (err) {
        socket.emit('error', 'Falha ao iniciar jogo com IA');
      }
    });

    socket.on('disconnect', () => {
      // Lógica de cleanup poderia ser adicionada aqui
    });
  });
};
