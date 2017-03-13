export function dot(p1, p2) {
  return (p1.x * p2.x) + (p1.y * p2.y);
}

export function value(p) {
  return Math.sqrt((p.x ** 2) + (p.y ** 2));
}

export function mult(val, p) {
  p.x *= val;
  p.y *= val;
  return p;
}

export function cross(p1, p2) {
  return p1.x * p2.y - p1.y * p2.x;
}
