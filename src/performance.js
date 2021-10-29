import { m } from "./util.js"

const stats = [];
let fpsDiv, changed = false;
export function showStats(idx, val){
  if(idx!=undefined) {
    if(stats[idx] == val) return;
    changed = true;
    stats[idx] = val;
  }
  if(!fpsDiv){
    fpsDiv = m(document.createElement('pre'),{},{fontFamily:'arial',position:'absolute',bottom:0,left:0,background:'black',color:'white'})
    document.body.appendChild(fpsDiv);
  }
  if(!changed) return;
  fpsDiv.textContent = stats.join('\n');
}

const middle = (min,max)=>min+(max-min)/2;
const median = a=>a.slice().sort((a,b)=>a-b)[Math.round(a.length/2)];
const nextFrame = ()=>new Promise(resolve=>requestAnimationFrame(resolve));

let N = 0;
export function findMaxNr(opts){
  opts = Object.assign({
    minNr:100,
    maxNr:100000,
    fps:60,
    samples:100,
    before:()=>{},
    after:()=>{},
  },opts);


  let target = 1000/opts.fps;
  if(opts.dt) target = opts.dt;

  let {minNr,maxNr} = opts;
  async function run(){
    minNr = Math.max(0,minNr);
    maxNr = Math.max(2,maxNr);
    let c = Math.round(middle(minNr, maxNr));
    if(!N++){
      console.log('warmup');
      await measure(c,100);
    }
    if(maxNr-minNr <= 1) {
      showStats(0,'');
      showStats(1,'');
      showStats(2, `${c} @ ${1000/opts.fps} fps / ${target.toFixed(3)} ms`);
      return opts.finish(c);
    }
    showStats(0, `current: ${c}`);
    let dt = (await measure(c, opts.samples));
    // console.log(c, Math.round(dt));
    showStats(2, `${c} @ ${Math.round(1000/dt)} fps / ${dt.toFixed(3)} ms`);
    if(dt<target) minNr = c
    else maxNr = c;
    requestAnimationFrame(run);
  }
  requestAnimationFrame(run);


  const measure = async (Nr, samples)=>{
    opts.init(Nr);
    const times = [];
    for(let i=0;i<samples;i++) {
      showStats(1, `${i}/${samples}`);
      await opts.before(Nr);
      const start = performance.now();
      await opts.loop(Nr);
      times.push((performance.now()-start))
      await nextFrame();
      await opts.after(Nr);
    }
    opts.clean&&opts.clean(Nr);
    return median(times);
  }

}
