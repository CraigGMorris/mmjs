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
 * Universal gas constant (CODATA 2018 recommended value)
 * Units: J / (mol * K)
 */
export const R_GAS = 8.31446261815324;

/**
 * Standard reference temperature
 * Units: K (25 °C)
 */
export const T_STD = 298.15;

/**
 * Standard reference pressure
 * Units: Pa (1 atm)
 */
export const P_STD = 101325.0;

/**
 * Small numerical epsilon to prevent division by zero
 */
export const EPSILON = 1e-15;
