import ky from "https://unpkg.com/ky@0.26.0/index.js";

const cx = ky.create({
    prefixUrl: `/proxy/cell.x-pl.art/`,
});
const hostname = "cell.x-pl.art";
export async function get() {
    return await cx.get(``).json();
}
export async function post() {
    return await cx.post(``, {
        json: {a: 5}
    }).text();
}
export const preview = get;