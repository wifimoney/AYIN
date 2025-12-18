"use strict";
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeDirection = exports.Outcome = exports.MarketStatus = void 0;
/**
 * Core types for Ayin agent
 */
// ============================================================================
// MARKET TYPES
// ============================================================================
var MarketStatus;
(function (MarketStatus) {
    MarketStatus["OPEN"] = "OPEN";
    MarketStatus["RESOLVED"] = "RESOLVED";
    MarketStatus["SETTLED"] = "SETTLED";
})(MarketStatus || (exports.MarketStatus = MarketStatus = {}));
var Outcome;
(function (Outcome) {
    Outcome[Outcome["UNRESOLVED"] = 0] = "UNRESOLVED";
    Outcome[Outcome["YES"] = 1] = "YES";
    Outcome[Outcome["NO"] = 2] = "NO";
})(Outcome || (exports.Outcome = Outcome = {}));
// ============================================================================
// STRATEGY TYPES
// ============================================================================
var TradeDirection;
(function (TradeDirection) {
    TradeDirection[TradeDirection["YES"] = 1] = "YES";
    TradeDirection[TradeDirection["NO"] = 2] = "NO";
})(TradeDirection || (exports.TradeDirection = TradeDirection = {}));
//# sourceMappingURL=types.js.map