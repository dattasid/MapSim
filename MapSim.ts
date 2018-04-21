import {Site, Vertex, Edge, Voronoi, BBox} from "./rhill-voronoi-core"
import {RNG } from "./RNG"
import {SVGRoot, SVGReset, SVGGroup, CPoly, SVGText, Rect, Circle} from "./SVG"
import { Color, hsbToRGB} from "./mycolor";
import {PNoise, TiledOctNoise} from "./Perlin"

let cc = console.log

function strToNum(a:any)
{
    if (isNaN(a))
    {
        let v = 1
        for (let i = 0; i < a.length; i++)
        {
            let c = a.charCodeAt(i);
            v = (v * 31 + c * 127) % 999565999
        }
        return v
    }
    else
    {
        return a
    }
}

class TimeKeeper {
    first = -1
    last = -1

    mark (msg)
    {
        let t = new Date().getTime();
        if (this.first == -1)
        {
            this.last = this.first = t
            console.log("Start: "+msg)
            return
        }
        else
        {
            console.log((t-this.last)+" "+(t-this.first)+" : "+msg)
            this.last = t
            return
        }
    }
}

class Queue {
    items: any[]
    size: number = 0
    start: number = 0
    count: number = 0

    constructor(size: number) {
        this.size = size
        this.items = new Array(size);
    }
    clear() {
        for (let i = 0; i < this.size; i++)
        {
            this.items[i] = null;
        }
    }
    // clone() {
    //     return new Queue(...this.items);
    // }
    // contains(item) {
    //     return this.items.includes(item);
    // }
    peek() {
        var item = null;
 
        if (this.count > 0) {
            item = this.items[0];
        }
         
        return item;
    }
    dequeue() {
        if (this.count <= 0)
        {
            return null
        }
        var removedItem = this.items[this.start];
        this.start = (this.start + 1) % this.size
        // this.items[this.start] = null;// maybe slow    
        this.count--
        return removedItem;
    }
    enqueue(item) {
        if (this.count >= this.size)
        {
            throw "Queue overflow!"
            // return
        }
        this.items[(this.start+this.count) % this.size] = item;
        this.count++
        return item;
    }
}

enum Biome{
    SEA, GRASS, MOUNTAIN
}
class MSite extends Site
{
    // Component based coordinates, not faster yet
    // id:number
    // static xarr
    // static yarr

    polyx:number[] = null
    polyy:number[] = null

    plate:number = 0
    isMapEdge = false
    plateDist:number[] = []



    biome: Biome = Biome.SEA

    toString():string{
        return "Site:"+this.voronoiId
    }
// Dint work much better
    // get x() {
    //     return MSite.xarr[this.id];
    // }
    // set x(v:number) {
    //     MSite.xarr[this.id] = v
    // }

    // get y() {
    //     return MSite.yarr[this.id];
    // }
    // set y(v:number) {
    //     MSite.yarr[this.id] = v
    // }
}

class Plate {
    id:number

    x:number
    y:number
    
    // Plate attr
    clr  = null
    type:number = 0
}
class AdjListII
{
    // Vertices are ints
    edges:number[][] = []
    directional:boolean = false

    storeEdge(v1:number, v2:number)
    {
        let lst = this.edges[v1];
        if (!lst)
            lst = this.edges[v1] = []
        if (lst.indexOf(v2) == -1)
            lst.push(v2)

        if (!this.directional)
        {
            lst = this.edges[v2];
            if (!lst)
                lst = this.edges[v2] = []
            if (lst.indexOf(v1) == -1)
                lst.push(v1)
        }
    }


    isEdge(v1:number, v2:number)
    {
        let lst = this.edges[v1]
        return lst && lst.indexOf(v2)>-1 
    }

    removeEdge(v1:number, v2:number)
    {
        let lst = this.edges[v1];
        if (lst) this.removeElem(lst, v2)
            
        if (!this.directional)
        {
            lst = this.edges[v2];
            if (lst) this.removeElem(lst, v1)
        }
    }

    private removeElem(arr:number[], val)
    {
        let idx = arr.indexOf(val)
        if (idx > -1)
            arr.splice(idx, 1)
    }

}

class AdjMat
{
    edges = []

    directional:boolean = false
    
    storeEdge(v1:number, v2:number, wt?:number)
    {
        let lst = this.edges[v1];
        if (wt != 0)
            wt = wt || 1
        
        if (!lst)
            lst = this.edges[v1] = []
        lst[v2] = wt

        if (!this.directional)
        {
            lst = this.edges[v2];
            if (!lst)
                lst = this.edges[v2] = []
            lst[v1] = wt
        }
    }
    
    
    isEdge(v1:number, v2:number)
    {
        let lst = this.edges[v1]
        return lst && lst[v2]
    }

    getWeight(v1:number, v2:number)
    {
        let lst = this.edges[v1]
        if (!lst || !lst[v2])
            return undefined
        return lst[v2]
    }

    removeEdge(v1:number, v2:number)
    {
        let lst = this.edges[v1];
        if (lst) delete lst[v2]
            
        if (!this.directional)
        {
            lst = this.edges[v2];
            if (lst) delete lst[v1]
        }
    }
}

class ArrSet<T>
{
    arr:T[] = []

    add(v:T)
    {
        for (let v1 of this.arr)
            if (v1 === v)
                return;
        this.arr.push(v)
    }
}

// Voronoi vert, vertices of the polygons in voronoi
class VVert
{
    static _id = 1
    /* readonly */id: number
    x:number
    y:number

    sites: ArrSet<number> = new ArrSet()
    constructor(v:Vertex)
    {
        this.id = VVert._id++
        this.x = v.x
        this.y = v.y
    }

    isEq(v:Vertex)
    {
        return this.x == v.x && this.y == v.y
    }
}

function clamp(val:number, min:number, max:number)
{
    if (val < min)
        return min;
    else if (val > max)
        return max;
    else return val;
}

let  generateTerrain = window['generateTerrain'] = function(ctx:any)
{
    // const NSITES = 5000
    // const NPLATES = 150

    // const NSITES = 10000
    // const NPLATES = 200

    // const NSITES = 20
    // const NPLATES = 5


    // const LAND_PLATE_CHANCE = .35
    // const MOUNTAIN_CHANCE = .15
    const POLE_LESS_POINTS = false // Expt later, not pretty yet

    // const PLATE_PERTURB_AMP = .05//.05
    // const PLATE_PERTURB_FREQ = 15//10

    // const HT_SMOOTH = .2
    // const HT_SMOOTH_TIMES = 3

    const T_MAX = 1
    const T_LAT_FACTOR = 1.1 // T goes 1 in eq to 0 in poles
    const T_HT_FACTOR = 1.1 // T goes 1 at bottom to 0 at 1ht which is max ht
    const T_LAND_HOTTER = .3

    // const LLOYD_COUNT = 2

    const SIMW = 1.5

    let NSITES:number = ctx["NSITES"]
    const LLOYD_COUNT = ctx["LLOYD_COUNT"]
    const NPLATES = ctx["NPLATES"]
    const PLATE_SEED = strToNum(ctx["PLATE_SEED"])
    const LAND_PLATE_CHANCE = ctx["LAND_PLATE_CHANCE"]
    const MOUNTAIN_CHANCE = ctx["MOUNTAIN_CHANCE"]
    const ISLAND_CHANCE = ctx["ISLAND_CHANCE"]
    const ISLAND_DENSITY = ctx["ISLAND_DENSITY"]

    const PLATE_PERTURB_AMP = ctx["PLATE_PERTURB_AMP"]
    const PLATE_PERTURB_FREQ = Math.floor(ctx["PLATE_PERTURB_FREQ"])
    const PLATE_PERTURB_OCT = ctx["PLATE_PERTURB_OCT"]

    // Mountain height
    const MT_HT = ctx["MT_HT"]
    const MT_HT_VAR = ctx["MT_HT_VAR"]

    // Plateau heights
    const PLATEAU_HT = ctx["PLATEAU_HT"]
    const PLATEAU_HT_VAR = ctx["PLATEAU_HT_VAR"]

    const HT_SMOOTH = ctx["HT_SMOOTH"]
    const HT_SMOOTH_TIMES = ctx["HT_SMOOTH_TIMES"]

    let t = new TimeKeeper()
    t.mark("")
    // let g = new AdjListII()
    // g.storeEdge(0, 1)
    // g.storeEdge(2, 3)

    // console.log(g.isEdge(0, 1))
    // console.log(g.isEdge(1, 0))
    // console.log(g.isEdge(0, 2))

    let sites:MSite[] = []
    let randPlates = new RNG(PLATE_SEED)
    
    let rand = new RNG(randPlates.nextInt(1, 99999999))

    const abs = Math.abs, cos = Math.cos, pi = Math.PI

    // SID_DEBUG code for square and hex
    // let gridy = Math.floor(Math.sqrt(NSITES/SIMW))
    // let gridx = Math.floor(gridy * SIMW)
    // let gg = 1 / (gridy)
    // NSITES = gridx * gridy
    // cc("~~", gridx, gridy, gg, NSITES)
    
    // MSite.xarr = new Float32Array(new ArrayBuffer(NSITES * Float32Array.BYTES_PER_ELEMENT))
    // MSite.yarr = new Float32Array(new ArrayBuffer(NSITES * Float32Array.BYTES_PER_ELEMENT))
    for (let i = 0; i < NSITES; i++)
    {
        sites[i] = new MSite()
        // sites[i].id = i

        sites[i].x = rand.nextDouble() * SIMW

        if (!POLE_LESS_POINTS)
            sites[i].y = rand.nextDouble()
        else
        {
            // less points at poles
            // pick a point, pick its chance (cosine curve)
            var y
            while (true)
            {
                y = rand.nextDouble()
                let chance = cos((2*y-1)*pi*.5*1.2)// last numebr is adjustment

                if (rand.chance(chance))
                    break;
            }
            sites[i].y = y
        }

        // SID_DEBUG Code for square and hex
        // let xx = i % gridx
        // let yy = Math.floor(i/gridx)
        // sites[i].x = xx * gg +(yy%2)*gg/2 +gg/2//+ yy*.001
        // sites[i].y = yy * gg + gg/2
        // // cc ("      ", xx, yy, sites[i].x, sites[i].y)
    }
    t.mark("Created sites")

    var bbox = <BBox>{xl:0, xr:SIMW, yt:0, yb:1};
    var voronoi = new Voronoi();
    // pass an object which exhibits xl, xr, yt, yb properties. The bounding
    // box will be used to connect unbound edges, and to close open cells
    let result = voronoi.compute(sites, bbox);
    
    for (let count = 0 ; count < LLOYD_COUNT; count++)
    {
        // Lloys relaxation
        for (let c of result.cells)
        {
            // Move Site center to centroid instead of Voronoi seeds
            let sx = 0, sy = 0;
            for (let h of c.halfedges)
            {
                let v = h.getStartpoint()
                sx += v.x
                sy += v.y
            }
            c.site.x = sx/c.halfedges.length
            c.site.y = sy/c.halfedges.length
        }

        // TODO SID_DEBUG wrap around map
        // Create fake Sites
        {
            // let sites1 = sites.slice(0)
            result = voronoi.compute(sites, bbox);
        }
    }
    t.mark("Voronoi done")
    // TODO: just assign ids = index
    // NOTE: VV Imp that index === id
    sites.sort((a, b)=>a.voronoiId - b.voronoiId)// Sort by voronoiId
    


    let siteAdj = new AdjListII()
    for (let e of result.edges)
    {
        if (e.lSite && e.rSite)
            siteAdj.storeEdge(e.lSite.voronoiId, e.rSite.voronoiId)
        
        if (e.lSite && !e.rSite)
            (e.lSite as MSite).isMapEdge = true
        if (e.rSite && !e.lSite)
            (e.rSite as MSite).isMapEdge = true
    }

    t.mark("Site graph")


    let vorVertSet:VVert[] = []
    let m = new Map<Vertex, VVert>()
    let vorGAdj = new AdjListII()
    function findInVertSet(v:Vertex): VVert
    {
        var vv:VVert
        vv = m.get(v)

    // TODO SID_DEBUG Wrap around
    // When working for wrapped around maps, vertices of voronoi polygons 
    // with x < 0 or x > 1 need to be mapped to correct vertices. Only way to do that
    // is to search for the vertex by comparing x and y, whcih may be very slow.
    // Even though only out of bounds vertices need to be mapped.
    // Using a array just for x and y of vertices may help, as it will be stored as 
    // a plain array 

        if (vv) return vv
        // NOTE IMPORTANT SID_DEBUG *****************************
        // This below block takes 250 ms for
        // 500 verts, which is HUGE. All it does is
        // make vertices on the bounding box unique.
        // If we dont care about those, keep this commented.
        // for (vv of vorVertSet)
        // {
        //     if (vv.isEq(v))
        //     {
        //         return vv
        //     }
        // }

        vv = new VVert(v)
        vv.id = vorVertSet.length// Id must be equal to index
        vorVertSet.push(vv)
        m.set(v, vv)
        return vv

    }
    for (let e of result.edges)
    {
        var v1 = findInVertSet(e.va)
        var v2 = findInVertSet(e.vb)

        if (e.lSite)
        {
            v1.sites.add((e.lSite as MSite).voronoiId)
            v2.sites.add((e.lSite as MSite).voronoiId)
        }

        if (e.rSite)
        {
            v1.sites.add((e.rSite as MSite).voronoiId)
            v2.sites.add((e.rSite as MSite).voronoiId)
        }

        vorGAdj.storeEdge(v1.id, v2.id)
    }
    t.mark("Site graph, voronoi graph")
    // Create the polygons
    for (let c of result.cells)
    {
        let x:number[] = [], y:number[] = []

        // let v0 = c.halfedges[0].getStartpoint()
        // let v1 = c.halfedges[0].getEndpoint()

        // x.push(v0.x); x.push(v1.x);
        // y.push(v0.y); y.push(v1.y);

        for (let i = 0; i < c.halfedges.length; i++)
        {
            let v0 = c.halfedges[i].getStartpoint()
            // let v1 = c.halfedges[i].getEndpoint()

            // if (x[x.length-1] != v0.x) console.log("Error! "+x+" "+v0.x)

            let yy = v0.y
            if (POLE_LESS_POINTS)
            {// Squeeze the coordinates at poles
                // yy /= 1
                yy = (2*yy-1)
                // yy = Math.sign(yy) * Math.pow(abs(yy), .7)
                yy = yy * (1 - .3*yy*yy)
                yy = (yy+1)* .5
            }
            x.push(v0.x);
            y.push(yy);
        }

        (c.site as MSite).polyx = x;
        (c.site as MSite).polyy = y;

        // Move Site center to centroid instead of Voronoi seeds
        let sx = 0, sy = 0;
        for (let i = 0; i < x.length; i++)
        {
            sx += x[i]
            sy += y[i]
        }
        c.site.x = sx/x.length
        c.site.y = sy/x.length
    }
    t.mark("Created site poly")
    // console.log(siteAdj)
    // 
    // console.log(result.vertices.length+" "+vorVertSet.length)
    // console.log(vorVertSet[0])
    // console.log(vorGAdj)
    // console.log(result)
    //console.log(sites)


    // Plates
    let plates:Plate[] = []
    let num_land_plates = 0;
    for (let i = 0; i < NPLATES; i++)
    {
        let p = new Plate()
        p.x = randPlates.nextDouble() * SIMW
        p.y = randPlates.nextDouble()

        p.id = i
        p.type = randPlates.chance(LAND_PLATE_CHANCE)?1:0
        if (p.type == 1)
            num_land_plates++;
        
        p.clr = hsbToRGB(rand.nextDouble()* .4 - .2 + p.type * .6,
             .9, rand.range(.6, .7)).toHex();//SID_DEBUG
        plates.push(p)
    }
    t.mark("Made plates")

    let randPlatesNoise = new RNG(randPlates.nextDouble()
                                    * 99999999)

    let w_perturb_x = new TiledOctNoise(randPlatesNoise, PLATE_PERTURB_FREQ, PLATE_PERTURB_FREQ, PLATE_PERTURB_FREQ, PLATE_PERTURB_OCT)
    let w_perturb_y = new TiledOctNoise(randPlatesNoise, PLATE_PERTURB_FREQ, PLATE_PERTURB_FREQ, PLATE_PERTURB_FREQ, PLATE_PERTURB_OCT)

    let pertx:number[] = []
    let perty:number[] = []
    t.mark("Start Assign site to plate")
    {

        for (let s of sites)
        {
            let sid = s.voronoiId
            let min = Infinity
            let min_i = -1

            // Perturb points to make plate boundaries curvy
            let sx = s.x, sy = s.y 
            //Map 0 to 1, keep it square
            let dx1 = (w_perturb_x.noise(sx/SIMW, sy/SIMW)*2-1) * PLATE_PERTURB_AMP
            let dy1 = (w_perturb_y.noise(sx/SIMW, sy/SIMW)*2-1) * PLATE_PERTURB_AMP

            sx += dx1
            sy += dy1

            pertx[sid] = sx
            perty[sid] = sy
            for (let p of plates)
            {
                // WRAP around distnace calc plate to sites
                // let offx = 0
                // NOTE!! SID_DEBUG Notes on wraparound:
                // 1. Plate warp noise must be wrap around
                // 2. Plateau noises must also be wrap around
                for (let offx = -SIMW; offx <= SIMW; offx += SIMW)
                {

                    let dx = sx - p.x - offx
                    let dy = sy - p.y

                    // More inflence at poles
                    // DID NOT WORK
                    // let dy1 = Math.abs(dy - .5)
                    // dy1 = dy1 * 200 + dy1 * dy1 * 4 * 20
                    // dx *= (1 + dy1)

                    let dist = dx*dx+dy*dy


                    if (dist < min)
                    {
                        min = dist
                        min_i = p.id
                    }
                }
            }

            s.plate = min_i
            if (min_i == -1)
                cc("Cannot find plate for site", s.voronoiId, min_i)
        }
    }
    t.mark("End assign site to plate")

    // Calculate plate adjacency
    let pAdj = new AdjListII()
    for (let vi1=0; vi1 < NSITES; vi1++)
    {
        if (!siteAdj.edges[vi1])
            continue
        
        let varr = siteAdj.edges[vi1]
        for (let vi2 of varr)
        {
            
            let site1 = sites[vi1], site2 = sites[vi2]

            if (site1.plate != site2.plate)
            {
                pAdj.storeEdge(site1.plate, site2.plate)

                site1.plateDist[site2.plate] = 1
                site2.plateDist[site1.plate] = 1

            }

        }
    }

    t.mark("Calculated plate adj")
    // Calculate distance of (non member) sites from neighbouring plates
    // upto distance 2
    for (let vi1 in siteAdj.edges)
    {
        let varr = siteAdj.edges[vi1]
        for (let vi2 of varr)
        {
            let site1 = sites[vi1], site2 = sites[vi2]
            
            for (let pi in site1.plateDist)
            {
                if (site1.plateDist[pi] == 1) // ONLY calculating dist 2 saves 200ms
                {
                    if (!site2.plateDist[pi])
                        site2.plateDist[pi] = site1.plateDist[pi] + 1
                    else if (site2.plateDist[pi] > site1.plateDist[pi]+1)
                        site2.plateDist[pi] = site1.plateDist[pi] + 1
                    // else no need to update, shorter path exists
                }
                
            }

            for (let pi in site2.plateDist)
            {
                if (site2.plateDist[pi] == 1)// ONLY calculating dist 2 saves 200ms
                {
                    if (!site1.plateDist[pi])
                        site1.plateDist[pi] = site2.plateDist[pi] + 1
                    else if (site1.plateDist[pi] > site2.plateDist[pi]+1)
                        site1.plateDist[pi] = site2.plateDist[pi] + 1
                    // else no need to update, shorter path exists
                }
            }
        }
    }
    t.mark("Site to plate dist 2 steps")

    let heights = new Float32Array(new ArrayBuffer(
        NSITES * Float32Array.BYTES_PER_ELEMENT
    ))
    for (let i = 0; i < NSITES; i++) heights[i] = -1


    

    {
        class PlateHt{
            min:number
            max:number

            nn:PNoise

            acos:number
            asin: number
            constructor()
            {
                this.max = Math.abs(randPlates.nextGaussian()+.1) * .25 * PLATEAU_HT
                
                if (this.max > PLATEAU_HT)
                    this.max = PLATEAU_HT
                // this.min = (randPlates.nextDouble() * .2 + randPlates.nextDouble() * .6) * this.max
                this.min = ((1-PLATEAU_HT_VAR) + randPlates.nextDouble() * PLATEAU_HT_VAR)
                                 * this.max

                if (randPlates.chance(.5))
                {
                    // Smooth plateau
                    this.nn = new PNoise(randPlatesNoise,
                        .05 + randPlatesNoise.nextDouble()*5, .05 + randPlatesNoise.nextDouble()*5, 2)
                }
                else 
                {
                    // Folds plateau
                    this.nn = new PNoise(randPlatesNoise,
                        .05 + randPlatesNoise.nextDouble(), 50 *(1+2*randPlatesNoise.nextDouble()), 2)
                }
                // cos + sin, -sin + cos
                let angle = randPlatesNoise.nextDouble() * Math.PI
                this.acos = Math.cos(angle)
                this.asin = Math.sin(angle)
            }
        }

        let plans: PlateHt[] = [];
        for (let i = 0; i < NPLATES; i++)
        {
            plans.push(new PlateHt())
        }

        for (let s of sites)
        {
            let id = s.voronoiId
            if (plates[s.plate].type == 0)// Dont do water
                continue;
            
            let plan = plans[s.plate]
            // if (heights[id] == 0) // If not declared plate fold mountain
            {
                // 1. Use perturbed coords to avoid ugly straight lines
                // 2. rotate the point
                // 2. Apply noise to area, may lead to simple variation or 
                //    striations/ graben hurst 
                let xx = pertx[id] * plan.acos + perty[id] * plan.asin;
                let yy = -pertx[id] * plan.asin + perty[id] * plan.acos;
                let nval = plan.nn.noise(xx, yy)
                // nval = clamp(nval, 0, 1)
                heights[id] = nval * (plan.max - plan.min) + plan.min
            }
            heights[id] = clamp(heights[id], 0, 1)
        }
    }
    t.mark("Done Height calculate")

    let mountains = new AdjMat()
    mountains.directional = true
    let num_mountains = 0;
    for (let pi1 = 0; pi1 < NPLATES; pi1++)
        for (let pi2 = pi1+1; pi2 < NPLATES; pi2++)
        {
            let roll = randPlates.nextDouble(); // Eat the random number,
                                                // use it or not for consistency
            // IMPORTANT NOTE!!! This will prevent mountains moving around due to
            // small tweaks to the map.
            let ht = MT_HT * .2 + Math.abs(randPlates.nextGaussian()) * MT_HT * .3
            
            if (pAdj.isEdge(pi1, pi2))
            {
                if (ht > 2 * MT_HT)
                    ht = 2 * MT_HT;// Capped to 1 after smooth
                
                if (plates[pi1].type == 0 && plates[pi2].type == 0)// SEA SEA, island
                {
                    if (roll <= ISLAND_CHANCE)
                    {
                        mountains.storeEdge(pi1, pi2, ht)
                    }
                }
                else if (roll <= MOUNTAIN_CHANCE)
                {
                    num_mountains++
                    if (plates[pi1].type == plates[pi2].type)// Both mountains or sea
                    {
                        mountains.storeEdge(pi1, pi2, ht)
                        // if (rand.chance(.3))
                        //     mountains.storeEdge(pi2, pi1)
                    }
                    else if (plates[pi1].type == 1) // Sea plates always go below
                    {
                        mountains.storeEdge(pi1, pi2, ht)
                    }
                    else if (plates[pi2].type == 1)
                    {
                        mountains.storeEdge(pi2, pi1, ht)
                    }
                }
            }
        }
    ;

    // let land_sites:MSite[] = []
    for (let s of sites)
    {
        let p = plates[s.plate]
        if (p.type == 0)// Sea
        {
            s.biome = Biome.SEA
            heights[s.voronoiId] = -1
        }
        else
        {
            s.biome = Biome.GRASS
            // land_sites.push(s)
        }

        s.plateDist.forEach((dist, pi:number)=>{

            if (mountains.isEdge(s.plate, pi))
            {
                if (s.biome == Biome.SEA)
                {
                    if (plates[pi].type == 0
                    && s.plateDist[pi] /*== 1*/ <= 2
                    && randPlates.chance(ISLAND_DENSITY))
                    {// Sea Sea, create volcanic island
                        s.biome = Biome.GRASS
                        heights[s.voronoiId] = clamp(Math.abs(randPlates.nextGaussian()) * .1, 0, 1)
                    }
                }
                else
                {   
                    if (
                        (plates[pi].type == 1
                        && s.plateDist[pi] == 1)// Land land, dist 1
                        || (plates[pi].type == 0
                        && s.plateDist[pi] == 2) // sea land
                    )
                    {
                        s.biome = Biome.MOUNTAIN
                        heights[s.voronoiId] += mountains.getWeight(s.plate, pi)
                                            * ( (1-MT_HT_VAR) + randPlates.nextDouble() * MT_HT_VAR)
                        // heights[s.voronoiId] = clamp(heights[s.voronoiId], 0, 1)// cap after smoothing
                    }
                }
            }
        })
    }

    t.mark("Done techtonic fold mountain")
    
    // Smooth heights
    for(let sct = 0; sct < HT_SMOOTH_TIMES; sct++)
    {
        let heights1 = new Float32Array(new ArrayBuffer(
            NSITES * Float32Array.BYTES_PER_ELEMENT
        ))
        for (let i = 0; i < NSITES; i++)
        {
            if (heights[i]< 0) // water
            {
                // NOTE: Water is counted as 0 so it will never bring down
                // land height to negative.
                heights1[i] = -1
                continue
            }
            let nbrs = siteAdj.edges[i]
            let n_nbrs = 0
            let sumHNbrs = 0
            for (let nbr of nbrs)
            {
                n_nbrs++
                if (heights[nbr] >= 0)// land
                {
                    sumHNbrs += heights[nbr]
                }
                // else water counts as 0
            }
            // Note: Water contributes 0, so land next to water is a bit shorter
            let avgHNbrs = sumHNbrs / n_nbrs

            let ht = heights[i] * (1-HT_SMOOTH) + avgHNbrs * HT_SMOOTH
            heights1[i] = ht
        }
        heights = heights1
    }
    for (let i = 0; i < NSITES; i++){
        if (heights[i] != -1)
            heights[i] = clamp(heights[i], 0, 1)
    }
    // Note: Remember -1 for water
    t.mark("Done Height smoothing")

    // Distnace of site from sea
    let seadist = new Uint16Array(new ArrayBuffer(
        NSITES * Uint16Array.BYTES_PER_ELEMENT
    ))
    {
        for (let i = 0; i < NSITES; i++)
            seadist[i] = 0
        
        let q = new Queue(NSITES * 2)
        // 1. Insert each site next to sea into q. Assign dist = 1
        // 2. For each site in q, go to nbr. If seadist[nbr] = 0 (unassigned) and land
        //    That neighbour has not been handled yet
        //    set seadist = seadist[this]+1, insert nbr in q
        // Each nbr can go only once in q, when seadist (was) 0
        for (let s of sites)
        {
            if (heights[s.voronoiId] >= 0)// land
            {
                for (let nbr of siteAdj.edges[s.voronoiId])
                {
                    if (heights[nbr] == -1)// sea
                    {
                        seadist[s.voronoiId] = 1
                        q.enqueue(s.voronoiId)
                        break
                    }
                }
            }
        }
        var sid
        while((sid = q.dequeue()) != null)
        {
            let thisdist = seadist[sid]
            for (let nbr of siteAdj.edges[sid])
            {
                if (heights[nbr] >= 0 // land
                    && seadist[nbr] == 0)// not calculated yet
                {
                    seadist[nbr] = thisdist + 1
                    q.enqueue(nbr)
                }
            }
        }
    }
    t.mark("Done calculate distance from sea")


    let is_river: boolean[] = []

    function bfs(start:number): number[]{
        //!!!!!!!!!!!!!!!!!!!! NOTE SID_DEBUG 
        // THERE IS A BUG HERE
        // Some rivers dont take the shortest route
        
        let q = new Queue(vorVertSet.length)
        q.enqueue(start)

        let parents:number[] = []// NOTE: Sparse
        parents[start] = -1

        // For DEBUG
        // let dist:number[] = []// NOTE: Sparse
        // dist[start] = 0

        // cc("-------------")
        var id
        // let count = 1000
        while((id = q.dequeue()) != null)
        {
            // cc("==", id, dist[id], "nbr", vorGAdj.edges[id])
            // finish condition
            if (id != start)
            {
                let v = vorVertSet[id]

                // if (v.y < .1 || v.y > .9)// Dont enter polar regions
                // {
                //     continue;
                // }

                let sea = false
                // if (is_river[id])// TODO: restore after height based
                //     sea = true;
                // else
                {
                    for (let sid of v.sites.arr)
                    {
                        if (heights[sid] == -1)// Water
                        {
                            sea = true
                            break
                        }
                    }
                }
                if (sea) // found
                {
                    // cc ("== success")
                    let ret = []
                    let vid = id
                    while ( (id || id == 0) && id != -1)
                    {
                        ret.push(id)

                        is_river[id] = true

                        id = parents[id]
                    }

                    return ret
                }
            }

            for (let nbr of vorGAdj.edges[id])
            {
                if (parents[nbr] === undefined) // not already seen
                {
                    q.enqueue(nbr)
                    parents[nbr] = id

                    // dist[nbr] = dist[id] + 1
                }
            }
        }

        return null
    }
    // Rivers
    class River {
        vid:number[] = []
    }
    let rivers:River[] = []
    for (let i = 0; i < 1000; i++)
    {
        let v = randPlatesNoise.pick(vorVertSet)
        if (v.y < .1 || v.y > .9)
        // Polar, probably
            continue;
        
        let land = true;
        for (let si of v.sites.arr)
        {
            if (heights[si] == -1)//water
            {
                land = false;
                break;
            }
        }

        if (!land)
            continue;
        // cc("Water ", v)
        let r = new River();
        // r.vid.push(v.id)
        // rivers.push(r)

        r.vid = bfs(v.id);
        if (r.vid)
        {
            rivers.push(r)
        }
        
    }
    t.mark("Done Rivers: "+rivers.length)
    // Start drawing SVG
    SVGReset();

    let H = 600;//SID_DEBUG
    let r = new SVGRoot(H * SIMW, H);

    // Note: Disable SVG anti aliasing. This makes the seams
    // between polygons disappear, makes rendering faster.
    // r.attrExtra = "shape-rendering=\"optimizeSpeed\""

    // Provide a background so that at least the water looks continuous
    // let back = new Rect(0, 0, W*SIMW, H)
    // back.nm="back"
    // back.fill="blue"
    // r.add(back)

    let floor = Math.floor
    for (let s of sites)
    {
        // if (s.isMapEdge) continue

        let p = new CPoly()
        for (let i = 0; i < s.polyx.length; i++)
        {
            p.add(
                floor(s.polyx[i]*H*1000)/1000,
                floor(s.polyy[i]*H*1000)/1000)
        }


        // let t = temperatures[s.voronoiId]
        let h = heights[s.voronoiId]
        p.fill = heightColor(h)

        // p.fill = plates[s.plate].clr//SID_DEBUG
        
        // p.strokeWidth = 1
        // p.strokeColor = "#000"


        // if (plates[s.plate])
        // {
        //     // p.fill = plates[s.platehsbToRGB(rand.nextDouble(), .9, rand.range(.6, .7)).toHex();
            
        //     let type = plates[s.plate].type

        //     for (let pi of s.plateDist)
        //     {
        //         if ((type == 1 && pi <= 2) || (type == 0 && pi <= 1))
        //         {
        //             p.opacity = .5
        //             break
        //         }
        //     }

 

        //     // if (s.plateDist.length > 0)
        //     //     p.opacity = .5
        // }

        p.nm = "site_"+s.voronoiId

        r.add(p)
        // r.add(new SVGText(""+s.voronoiId, s.x*W, s.y*H))
    }

    // Rivers SVG
    let rg = new SVGGroup()
    rg.nm = "rivers"

    r.add(rg)
    // console.log(rivers)
    for (let rvr of rivers)
    {
        let poly = new CPoly()
        poly.strokeColor = "blue"
        poly.strokeWidth = 1
        poly.fill = "none"
        poly.closed = false;

        rg.add(poly)

        for (let vid of rvr.vid)
        {
            let v = vorVertSet[vid]

            let x = v.x * H
            let y = v.y * H

            poly.add(x, y)

        }
    }

    // Count land vs sea
    {
        let land = 0, sea = 0
        let ht_histo = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ht_max = 0;
        for (let s of sites)
        {
            if (s.biome == Biome.SEA) sea ++
            else land++

            let h = heights[s.voronoiId];
            if (h > 0)
            {
                let idx = Math.floor(h * 10)

                if (ht_histo[idx] === undefined)
                    ht_histo[idx] = 0
                else
                    ht_histo[idx]++
                
                if (h > ht_max)
                    ht_max = h
            }
        }
        console.log("Land "+(land/(land+sea)*100)+" %")
        console.log("Max height: "+ht_max)
        console.log("Ht histo: "+ht_histo)
    }
    console.log("Num land plates: "+num_land_plates)
    // console.log("Num Mountains: "+num_mountains)

    t.mark("All done")

    let outline = new SVGGroup()
    outline.nm = "outline"
    r.add(outline)

    addToDoc(r);

    window["sites"] = sites;
    window["plates"] = plates;
    // window["temp"] = temperatures;SID_DEBUG
    window["height"] = heights;
    window["seadist"] = seadist;

    // Sites light up when clicked.
    for (let s of sites)
    {
        let e = document.getElementById("site_"+s.voronoiId)
        if (e)
        {
            e.onclick = siteClicked
        }
    }

    let allScale = 1, allDx = 0, allDy = 0
    let allMD = false, allDidMove = false
    let allDragX = -1, allDragY = -1
    const INC = .1
    {
        // Allow drag and zoom
        let e = document.getElementById("SHP0")
        if (e)
        {
            e.onwheel = function(event:WheelEvent)
            {
                let sgn = Math.sign(event.wheelDelta)
                allScale += INC * sgn
                allScale = clamp(allScale, .5, 32)

                allDx -= INC * event.offsetX * sgn;
                allDy -= INC * event.offsetY * sgn;

                if (allDx > 0) allDx = 0
                if (allDy > 0) allDy = 0

                e.setAttribute("transform", "translate("+allDx+","+allDy+") "+
                    "scale("+allScale+")")
                // console.log(event)
                return false
            }

            e.onmousedown = function (event)
            {
                if (event.buttons == 1)
                {
                    allDragX = event.offsetX
                    allDragY = event.offsetY
                    allMD = true
                    allDidMove = false
                }
                // console.log(event)
            }
            e.onmouseup = function (event)
            {
                if (event.buttons == 1)
                {
                    allMD = false
                    allDragX = -1
                    allDragY = -1

                    if (allDidMove) return false// Dont create click event
                }
                // console.log(event)
            }
            e.onmousemove = function(event:MouseEvent)
            {
                if (event.buttons == 1)
                {
                    allDidMove = true

                    let dx = event.offsetX - allDragX
                    let dy = event.offsetY - allDragY

                    allDragX = event.offsetX
                    allDragY = event.offsetY

                    allDx += dx;
                    allDy += dy;
    
                    if (allDx > 0) allDx = 0
                    if (allDy > 0) allDy = 0
    
                    e.setAttribute("transform", "translate("+allDx+","+allDy+") "+
                        "scale("+allScale+")")
                }
                // console.log(event.buttons)
            }

        }
    }
}

class Biome2 {
    static _id = 0;
    readonly id;
    public constructor(public name:string, public minT:number, public maxT:number,
                       public minP:number, public maxP:number,
                    public color:string)
    {
        this.id = Biome2._id++;
    }

    public apply(t:number, p:number)
    {
        if (t>=this.minT && t<= this.maxT
            && p >= this.minP && p <= this.maxP)
            return true;
        return false;
    }
}

let
    POLAR = new Biome2("Polar", -100, 0, -100, 100, "#eee"),
    TUNDRA = new Biome2("Tundra", 0, .1, -100, 100, "#88f"),
    COLD_DESERT = new Biome2("Cold desert", .1, .7, 0, .2, hsbToRGB(.08, .8, .4).toHex()),
    BOREAL = new Biome2("Boreal", .1, .3, .2, 1, hsbToRGB(.4, .6, .2).toHex()),
    TEMPERATE = new Biome2("Temperate seasonal", .3, .7, .2, .6, hsbToRGB(.5, .7, .4).toHex()),//TBD COLOR!
    T_RAINFOREST = new Biome2("Temperate rainforest", .3, .7, .6, 1, hsbToRGB(.45, .9, .6).toHex()),//TBD COLOR!

    HOT_DESERT = new Biome2("Hot desert", .7, 2, 0, .3, "#dd0"),
    SAVANNA = new Biome2("Savanna", .7, 2, .3, .6, hsbToRGB(.28, .6, .5).toHex()),
    RAINFOREST = new Biome2("Tropical rainforst", .7, 2, .6, 2, hsbToRGB(.33, .9, .3).toHex()),

    SEA = new Biome2("Sea", -1, -1, -1, -1, "blue")
    ;
const ALL_BIOME = [ POLAR, TUNDRA, COLD_DESERT, BOREAL, TEMPERATE, T_RAINFOREST,
     HOT_DESERT, SAVANNA, RAINFOREST,]

let generateClimate = window["generateClimate"] = function (ctx)
{
    let sites: MSite[] = window["sites"];
    let NSITES = sites.length;
    let heights: number[] = window["height"];

    const SEED = strToNum(ctx["CLIMATE_SEED"])
    const CLIM_SIM:boolean = ctx["CLIM_SIM"] == "CLIM_SIM_SIM"
    const RAND_T_METHOD = ctx["RAND_T_METHOD"]
    const P_ADJUST:number = parseFloat(ctx["P_ADJUST"])
    const T_ADJUST:number = parseFloat(ctx["T_ADJUST"])

    const T_MAX = 1;
    const T_LAND_HOTTER = CLIM_SIM?.1:0;
                // Ocean circulation will change it further
                // No effect in random climate as sea temp is useless
    
    const T_HT_FACTOR = ctx["T_HT_FACTOR"]-0
    const T_LAT_ADJ = ctx["T_LAT_ADJ"]-0
    
    const T_RAND_FREQ = Math.floor(ctx["T_RAND_FREQ"]-0)
    const T_RAND_OCT = ctx["T_RAND_OCT"]-0

    const P_RAND_FREQ = Math.floor(ctx["P_RAND_FREQ"]-0)
    const P_RAND_OCT = ctx["P_RAND_OCT"]-0

    const pi = Math.PI

    let tk = new TimeKeeper()
    tk.mark("Start Climate generation")

    // let temperatures:number[] = []
    let temperatures = new Float32Array(new ArrayBuffer(
        NSITES * Float32Array.BYTES_PER_ELEMENT
    ))

    if (RAND_T_METHOD == "RAND_T_LAT")
    {
        for (let i = 0; i < NSITES; i++)
        {
            let s = sites[i];

            let lat = (s.y - .5)*2
            let t = (Math.cos(lat * pi * T_LAT_ADJ) + 1)/2 * T_MAX 

            t = (t-.1) * 1.1
            if (s.biome != Biome.SEA)
            {
                // t *= (1+T_LAND_HOTTER)
                t -= T_HT_FACTOR * heights[s.voronoiId]
            }
            else
            {
                t *= (1-T_LAND_HOTTER)
            }
            temperatures[i] = t + T_ADJUST
        }
    }
    else
    {
        let tn = new TiledOctNoise(new RNG(SEED*2 ), T_RAND_FREQ, T_RAND_FREQ,
                                    T_RAND_FREQ, T_RAND_OCT)
        for (let i = 0; i < NSITES; i++)
        {
            let s = sites[i];
    
            let t = tn.noise(s.x, s.y)
            if (s.biome != Biome.SEA)
            {
                // t *= (1+T_LAND_HOTTER)
                t -= T_HT_FACTOR * heights[s.voronoiId]
            }

            t = clamp(t * 2 - .3, -.2, 1)
            temperatures[i] = t + T_ADJUST
        }
    }
    window["temp"] = temperatures;
    tk.mark("Done temperatures")

    let pn = new TiledOctNoise(new RNG(SEED), P_RAND_FREQ, P_RAND_FREQ, P_RAND_FREQ, P_RAND_OCT)
    // let precip:number[] = []
    let precip = new Float32Array(new ArrayBuffer(
        NSITES * Float32Array.BYTES_PER_ELEMENT
    ))
    for (let i = 0; i < NSITES; i++)
    {
        let s = sites[i];

        let p = pn.noise(s.x, s.y)
        //SID_DEBUG
        // let x = s.x;//(s.x+.7)%1.5
        // let p = (pn.noise(x, s.y) + pn.noise(1.5-x, s.y))/2

        p = clamp(p * 2 - .6, 0, 1)
        precip[i] = p + P_ADJUST
    }

    window["precip"] = precip;

    tk.mark("Done Precipitation")
    let biome:Biome2[] = []
    for (let i = 0; i < NSITES; i++)
    {
        let s = sites[i];

        let t = temperatures[i]
        let p = precip[i]

        if (t > 0 &&  heights[i] == -1)
        {
            biome[i] = SEA;
            continue;
        }
        let b_find = null;
        for (let b of ALL_BIOME)
        {

            if (b.apply(t, p))
            {
                b_find = b
                break;
            }
        }

        biome[i] = b_find
    }

    window["biome"] = biome;
    tk.mark("Biome")
}

function siteClicked(event:MouseEvent)
{
    let outline = document.getElementById("outline")
    while (outline.firstChild) {
        outline.removeChild(outline.firstChild);
    }

    let path = event.target as HTMLElement
    if (path.id == "cloned" )
    {
        return
    }
    let path1 = path.cloneNode()

    outline.appendChild(path1)
    let path1a = path1 as HTMLElement
    path1a.id="cloned"
    path1a.style.stroke = "red"
    path1a.style.strokeWidth = "1"
    // path1a.style.fill = "rgba(0, 0, 0, 0)"
    path1a.style.fill = "transparent"

    path1a.onclick = siteClicked

    let id = parseInt(path.id.substring(5))
    console.log("Height", id, window["height"][id], "plate", window["sites"][id].plate,
            // "seadist", window["seadist"][id])
            "biome", window["biome"][id].name)
}

function tempColor(t:number)
{
    if (t > 0)
        return hsbToRGB(0, 1, t).toHex()
    else
        return hsbToRGB(.7, 1, -t).toHex()
}

function heightColor(h:number)
{
    h *= 2
    if (h >= 0)
        return hsbToRGB(0, 0, h*.8).toHex()
    else
        return "#01a"
}

declare function drawOnCanvas(svgdata:string);

declare function setupSVGSave(svgdata:string, type:string);
function addToDoc(r:SVGRoot):void
{
    let svgml = r.toSVG();

    // Show SVG
    document.getElementById("canvas").innerHTML=svgml;
    // console.log(svgml);

    console.log(svgml.length);

    // Show SVG on canvas
//    drawOnCanvas(svgml);
    
    // setupSVGSave(svgml);
}

var f
//f(); SID_DEBUG
// var intv = setInterval(f, 2000);
var intv

window["plateColor"] = function () {
    let sites = window["sites"] as MSite[]
    let plates = window["plates"] as Plate[]

    for (let s of sites)
    {
        let e = document.getElementById("site_"+s.voronoiId)
        if (e)
        {
            let pl = plates[s.plate]

            e.style.fill=pl.clr
        }
    }
}

window["biomeColor"] = function () {
    let biomes = window["biome"] as Biome2[]
    let sites = window["sites"] as MSite[]

    if (!biomes || !sites)
    {
        console.log("Biome or sites not generated")
        return
    }
    for (let i = 0; i < biomes.length; i++)
    {
        let s = sites[i]
        let b = biomes[i];
        let e = document.getElementById("site_"+s.voronoiId)
        
        if (e)
        {
            if (b != null)
            {
                e.style.fill = b.color
                // e.style.stroke = b.color
                // e.style.strokeWidth = "1"                
            }
            else
                e.style.fill = "brightpurple"
            
        }
    }

    setupSVGSave(document.getElementById("canvas").innerHTML, 'biome')
}

window["tempColor"] = function (type:string) {
    let sites = window["sites"] as MSite[]
    let arr: number[]
    if (type == "temp")
        arr = window["temp"]
    else if (type == "precip")
        arr = window["precip"]

    for (let s of sites)
    {
        let id = s.voronoiId
        let e = document.getElementById("site_"+id)
        if (e)
        {
            e.style.fill=tempColor(arr[id])
        }
    }
}

window["heightColor"] = function () {
    let sites = window["sites"] as MSite[]
    let ht = window["height"] as number[]
    for (let s of sites)
    {
        let id = s.voronoiId
        let e = document.getElementById("site_"+id)
        if (e)
        {

            e.style.fill=heightColor(ht[id])
        }
    }
    
    setupSVGSave(document.getElementById("canvas").innerHTML, 'height')
}