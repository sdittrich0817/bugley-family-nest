// Cover art for arcade games, shared by the arcade and the Studio dashboard.
import type { ArcadeId } from './arcade';
import meadowArt from '@/assets/games/cover-memory.jpg';
import dragonArt from '@/assets/games/cover-dragon.jpg';
import oceanArt from '@/assets/games/cover-ocean.jpg';
import creatureArt from '@/assets/games/cover-creature.jpg';
import guessArt from '@/assets/games/cover-guesses.jpg';
import manorArt from '@/assets/games/cover-manor.jpg';
import storyArt from '@/assets/games/cover-story.jpg';
import doodleArt from '@/assets/games/cover-doodle.jpg';
import mazeArt from '@/assets/games/cover-maze.jpg';
export const ARCADE_ART: Partial<Record<ArcadeId, string>> = { memory_meadow: meadowArt, dragon_catch: dragonArt, ocean_quest: oceanArt, creature_lab_v2: creatureArt, cosmic_maze: mazeArt, mystery_manor: manorArt, bugley_guesses: guessArt, doodle_duel: doodleArt, story_blanks: storyArt };
