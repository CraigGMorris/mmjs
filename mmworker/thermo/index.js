// @ts-check

/**
 * jsflash - High-Performance Zero-Dependency Thermodynamics Engine
 *
 * Copyright (C) 2026 jsflash contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @fileoverview Main entry point for jsflash - High-Performance Zero-Dependency Thermodynamics Engine.
 */

export * from './math/constants.js';
export * from './math/linalg.js';
export * from './math/cubic-solver.js';
export * from './types/index.js';
export * from './registry/index.js';
export * from './eos/mixing-rules.js';
export * from './eos/peng-robinson.js';
export * from './flash/rachford-rice.js';
export * from './flash/properties.js';
export * from './flash/flash-tp.js';
export * from './flash/inside-out-params.js';
export * from './flash/inside-out-inner.js';
export * from './flash/inside-out.js';
export * from './flash/immiscible-3p.js';
export * from './flash/envelope.js';
export * from './flash/flash-engine.js';

