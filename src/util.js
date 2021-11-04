// Random
export const R = v=>Math.floor(Math.random()*v);

// Dom element/style merge
export const m=(e,c,s)=>{Object.assign(e,c); if(e.style && s)Object.assign(e.style,s); return e;}

// create a new object with only props in list
export const createPropFilter = list => o =>Object.fromEntries(Object.entries(o).filter(x=>list.includes(x[0])))

