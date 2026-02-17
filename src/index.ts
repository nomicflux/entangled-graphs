import type { Complex, Operator, Qubit } from "./types";
import * as qubit from "./qubit";
import * as complex from "./complex";

type CanvasRegistry = Map<string, CanvasRenderingContext2D | null>;

function create_context(registry: CanvasRegistry, id: string): CanvasRenderingContext2D {
    const entry = registry.get(id);
    if (entry) {
        return entry;
    } else {
        const canvas = document.getElementById("entangled-canvas") as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        registry.set(id, ctx);
        return ctx;
    }
}

type Point = {
    x: number,
    y: number
}

function from_complex(c: Complex): Point {
    return { x: c.real, y: c.imag };
}

function draw_circle(registry: CanvasRegistry, canvas: string, origin: Point, radius: number) {
    const ctx = create_context(registry, canvas);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius, 0, 2 * Math.PI, false);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
}

function draw_line(registry: CanvasRegistry, canvas: string, start: Point, end: Point) {
    const ctx = create_context(registry, canvas);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
}

type ViewSettings = {
    height: number,
    width: number
}

function point_offset(pt: Point, offset: Point): Point {
    return { x: pt.x + offset.x, y: offset.y - pt.y };
}

function point_scale(pt: Point, s: number): Point {
    return { x: pt.x * s, y: pt.y * s };
}

function draw_qubit(registry: CanvasRegistry, canvas: string, settings: ViewSettings, q: Qubit) {
    const origin: Point = { x: settings.width / 2, y: settings.height / 2 };
    const radius: number = settings.width / 16;
    draw_circle(registry, canvas, origin, radius);
    const end_a = point_offset(point_scale(from_complex(q.a), radius), origin);
    draw_line(registry, canvas, origin, end_a);
    const end_b = point_offset(point_scale(from_complex(q.b), radius), origin);
    draw_line(registry, canvas, origin, end_b);
}

function initialize() {
    const canvas = "entangled-canvas";
    const registry: CanvasRegistry = new Map;
    const settings: ViewSettings = { height: 400, width: 400 };
    const q: Qubit = qubit.qubit(complex.complex(1,0), complex.complex(0,1));
    draw_qubit(registry, canvas, settings, q);
}

window.onload = initialize;
