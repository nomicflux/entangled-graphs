"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.H = exports.X = void 0;
exports.mk_op = mk_op;
exports.mk_real_op = mk_real_op;
exports.transpose = transpose;
exports.adjoint = adjoint;
exports.scale = scale;
exports.mult_op = mult_op;
const complex = __importStar(require("./complex"));
function mk_op(o00, o01, o10, o11) {
    return { o00, o01, o10, o11 };
}
function mk_real_op(o00, o01, o10, o11) {
    return {
        o00: complex.from_real(o00),
        o01: complex.from_real(o01),
        o10: complex.from_real(o10),
        o11: complex.from_real(o11)
    };
}
function transpose(op) {
    return mk_op(op.o00, op.o10, op.o01, op.o11);
}
function adjoint(op) {
    return mk_op(complex.conjugate(op.o00), complex.conjugate(op.o10), complex.conjugate(op.o01), complex.conjugate(op.o11));
}
function scale(op, s) {
    return mk_op(complex.scale(op.o00, s), complex.scale(op.o01, s), complex.scale(op.o10, s), complex.scale(op.o11, s));
}
function mult_op(op1, op2) {
    return mk_op(complex.add(complex.mult(op1.o00, op2.o00), complex.mult(op1.o01, op2.o10)), complex.add(complex.mult(op1.o00, op2.o01), complex.mult(op1.o01, op2.o11)), complex.add(complex.mult(op1.o10, op2.o00), complex.mult(op1.o11, op2.o10)), complex.add(complex.mult(op1.o10, op2.o01), complex.mult(op1.o11, op2.o11)));
}
exports.X = mk_real_op(0, 1, 1, 0);
exports.H = scale(mk_real_op(1, 1, 1, -1), 1 / Math.sqrt(2));
