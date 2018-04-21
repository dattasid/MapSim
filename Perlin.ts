import {RNG} from "./RNG"

import {SVGRoot, Rect} from "./SVG"
import { Color, hsbToRGB} from "./mycolor";

export class Perlin {

   static noise(x:number, y:number, z:number) {
    let P = Perlin
    let X = Math.floor(x) & 255,                  // FIND UNIT CUBE THAT
        Y = Math.floor(y) & 255,                  // CONTAINS POINT.
        Z = Math.floor(z) & 255;
    x -= Math.floor(x);                                // FIND RELATIVE X,Y,Z
    y -= Math.floor(y);                                // OF POINT IN CUBE.
    z -= Math.floor(z);
    let u = Perlin.fade(x),                                // COMPUTE FADE CURVES
        v = Perlin.fade(y),                                // FOR EACH OF X,Y,Z.
        w = Perlin.fade(z);
    let A = Perlin.p[X  ]+Y, AA = Perlin.p[A]+Z, AB = Perlin.p[A+1]+Z,      // HASH COORDINATES OF
        B = Perlin.p[X+1]+Y, BA = Perlin.p[B]+Z, BB = Perlin.p[B+1]+Z;      // THE 8 CUBE CORNERS,

    return P.lerp(w, P.lerp(v, P.lerp(u, P.grad(P.p[AA  ], x  , y  , z   ),  // AND ADD
                                     P.grad(P.p[BA  ], x-1, y  , z   )), // BLENDED
                             P.lerp(u, P.grad(P.p[AB  ], x  , y-1, z   ),  // RESULTS
                                     P.grad(P.p[BB  ], x-1, y-1, z   ))),// FROM  8
                     P.lerp(v, P.lerp(u, P.grad(P.p[AA+1], x  , y  , z-1 ),  // CORNERS
                                     P.grad(P.p[BA+1], x-1, y  , z-1 )), // OF CUBE
                             P.lerp(u, P.grad(P.p[AB+1], x  , y-1, z-1 ),
                                     P.grad(P.p[BB+1], x-1, y-1, z-1 ))));
   }
   static fade(t:number) { return t * t * t * (t * (t * 6 - 15) + 10); }
   static lerp(t:number, a:number, b:number) { return a + t * (b - a); }
   static grad(hash:number, x:number, y:number, z:number):number
   {
      let h = hash & 15;                      // CONVERT LO 4 BITS OF HASH CODE
      let u = h<8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
          v = h<4 ? y : h==12||h==14 ? x : z;
      return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
   }
   // Note: not necessary to use this particular permutation
   static readonly p: number[] = [
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,

    // Copy
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
   ];
//    static const permutation = [ 151,160,137,91,90,15,
//    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
//    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
//    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
//    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
//    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
//    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
//    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
//    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
//    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
//    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
//    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
//    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
//    ];
//    static { for (int i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i]; }
}

export class PNoise{
    dx = []
    dy = []
    scalex = 1
    scaley = 1
    octaves = 1
    max = 1
    constructor(rand: RNG, scalex:number = 1, scaley:number = scalex, octaves = 1)
    {
        this.scalex = scalex
        this.scaley = scaley

        this.octaves = octaves

        this.max = 0
        let s = 1
        for (let i = 0 ; i < octaves; i++)
        {
            this.dx.push(rand.nextDouble() * 255)
            this.dy.push(rand.nextDouble() * 255)

            this.max += s
            s *= .5
        }
    }

    noise(x:number, y:number)
    {
        let s = 0, nscale = 1, xscale = 1
        for (let i = 0; i < this.octaves; i++)
        {
            s += Perlin.noise(x * xscale * this.scalex + this.dx[i],
                              y * xscale * this.scaley + this.dy[i],
                              /*.5*/0) * nscale

            xscale *= 2
            nscale *= .5
        }
        s = (s + this.max)/this.max/2
        // s /= this.max
        return s
    }
}

const IR2 = .707;// 1/root_2
export class TiledNoise {
    
    static readonly dirs = [-1, -1,   1, -1,    1, 1,   -1, 1,
                            0, 1,   0,-1,   1,0,  -1,0]

    static readonly ndirs = 8

    perm 


    constructor(rand:RNG, public tileX:number, public tileY:number){
        let p1 = new Array(256)
        for (let i = 0; i < 256; i++) p1[i] = i
        rand.shuffle(p1)
        this.perm = new Array(512)
        for (let i = 0; i < 256; i++) this.perm[i] = this.perm[256+i] = p1[i]


    }

    surflet(x:number, y:number,
         intX:number, intY:number,
         gridX:number, gridY:number){

        let distX = Math.abs(x-gridX)
        let distY = Math.abs(y-gridY)
        let polyX = 1 - 6*distX**5 + 15*distX**4 - 10*distX**3
        let polyY = 1 - 6*distY**5 + 15*distY**4 - 10*distY**3
        let hashed = this.perm[this.perm[gridX%this.tileX] + gridY%this.tileY]
        hashed = (hashed % TiledNoise.ndirs) * 2
        let grad = (x-gridX)*TiledNoise.dirs[hashed]
                 + (y-gridY)*TiledNoise.dirs[hashed+1]
        return polyX * polyY * grad
    }

    noise2(x:number, y:number)
    {
        let intX = Math.floor(x)
        let intY = Math.floor(y)
    return (this.surflet(x, y, intX, intY, intX+0, intY+0) + 
            this.surflet(x, y, intX, intY, intX+1, intY+0) +
            this.surflet(x, y, intX, intY, intX+0, intY+1) +
            this.surflet(x, y, intX, intY, intX+1, intY+1))
    }
}

export class TiledPerlin {
    
    noise2(x:number, y:number, tileX:number, tileY:number) {
        let P = Perlin, t=this, TP = TiledPerlin;
        let X = Math.floor(x),                  // FIND UNIT CUBE THAT
            Y = Math.floor(y);                  // CONTAINS POINT.
        x -= X;                                // FIND RELATIVE X,Y,Z
        y -= Y;                                // OF POINT IN CUBE.
        let X1 = (X+1)%tileX, Y1 = (Y+1)%tileY
        X %= tileX
        Y %= tileY

        let u = P.fade(x),                                // COMPUTE FADE CURVES
            v = P.fade(y);                                // FOR EACH OF X,Y,Z.
        // HASH COORDINATES OF // THE 8 CUBE CORNERS,
        let A = t.p[X  ],
            AA = t.p[A+Y], // X Y
            AB = t.p[A+Y1],// X Y+1
            B = t.p[X1],
            BA = t.p[B+Y], // X+1 Y
            BB = t.p[B+Y1]; // X+1 Y+1
    // Add blended results from all corners
        return P.lerp(v, P.lerp(u, TP.grad(t.p[AA  ], x  , y ),  // AND ADD
                                   TP.grad(t.p[BA  ], x-1, y)), // BLENDED
                         P.lerp(u, TP.grad(t.p[AB  ], x  , y-1),  // RESULTS
                                   TP.grad(t.p[BB  ], x-1, y-1)))// FROM  8
                         
       }
    //    static fade(t:number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    //    static lerp(t:number, a:number, b:number) { return a + t * (b - a); }
       static grad(hash:number, x:number, y:number):number
       {
           // CONVERT LO 3 BITS OF HASH CODE // INTO 8 GRADIENT DIRECTIONS.
          let h = hash & 7;
          var u, v
          if (h < 4)
          {
              u = x
              v = y
          }
          else
          {
              u = 0
              v = (h&1)?x:y
          }
         
          return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
        }

        public p: number[]
        constructor(rand:RNG){
            let p1 = new Array(256)
            for (let i = 0; i < 256; i++) p1[i] = i
            rand.shuffle(p1)
            this.p = new Array(512)
            for (let i = 0; i < 256; i++) this.p[i] = this.p[256+i] = p1[i]
        }
}

export class TiledOctNoise{
    dx = []
    dy = []
    scalex = 1
    scaley = 1
    octaves = 1
    max = 1
    n_: TiledPerlin
    constructor(rand: RNG, scalex:number = 1, scaley:number = scalex,
        public tile:number = 256, octaves = 1)
    {
        this.scalex = scalex
        this.scaley = scaley

        this.octaves = octaves

        this.tile = Math.floor(this.tile)

        this.max = 0
        let s = 1
        for (let i = 0 ; i < octaves; i++)
        {
            this.dx.push(rand.nextDouble() * this.tile)
            this.dy.push(rand.nextDouble() * this.tile)

            this.max += s
            s *= .5
        }
        // this.dx[0] = this.dy[0] = .4//SID_DEBUG
        this.n_ = new TiledPerlin(rand)
    }

    noise(x:number, y:number)
    {
        let s = 0, nscale = 1, xscale = 1, tile = this.tile
        let n_ = this.n_
        for (let i = 0; i < this.octaves; i++)
        {
            s += n_.noise2(x * xscale * this.scalex + this.dx[i],
                              y * xscale * this.scaley + this.dy[i],
                              tile, tile) * nscale

            xscale *= 2
            nscale *= .5
            tile <<= 1
        }
        s = (s + this.max)/this.max/2
        // s /= this.max
        return s
    }
}
// let rand = new RNG()
// for (let i = 0; i < 100; i++)
// {
//     let j = rand.nextInt(0, 255)
//     console.log(j, Perlin.grad(j, 1, 1, 1))
// }

// console.log(211, Perlin.grad(211, 1, 1, 1))

// ************ Calculate Sanity, Average
// let max = -Infinity, min = Infinity
// // console.log(Perlin.p.length)
// let y = 0, z = .5;
// z = 1;
// let sum = 0, ct = 0;
// let pn = new PNoise(new RNG(), 1, 1, 5)
// for (let x = -1; x < 1; x+=.001)
// for (y = -20; y < 20; y+=.001)
// // for (z = -2; z < 4; z+=.01)
// {
//     // let n = Perlin.noise(x, y, z)
//     let n = pn.noise(x, y);
//     if (n < min) min = n
//     if ( n > max) max = n

//     sum += n
//     ct++
// }
// console.log(min, max)
// console.log(sum, ct, sum/ct)

// Test by creating SVG with lots of rect pixels
// const W = 400
// let r = new SVGRoot(W, W);
// let rand = new RNG()
// let per = 2
// // let nn = new PNoise(rand, 2, 2, 5)
// // let nn = new TiledNoise(rand, 2, 2)
// // let nn = new TPer(rand)
// let nn = new PNoise2(rand, 1, 1, 2, 3)
// let D = .01
// for (let x = 0; x < 1; x+=D)
// for (let y = 0; y < 1; y+=D)
// // for (z = -2; z < 4; z+=.01)
// {
//     let x1 = x * 2, y1 = y * 2
//     if (x1 > 1) x1 -= 1
//     if (y1 > 1) y1 -= 1
//     // let n = Perlin.noise(x*8 + 1.1, y*8 + 2.3, .5)
//     // let n = nn.noise(x, y)
//     let n = nn.noise(x1*per, y1*per)

// // if (n == NaN) console.log ("ER")
// // if (n < -1 || n > 1) console.log(n)

//     let a = new Rect(x*W, y*W, D*W, D*W)
//     // let clr = hsbToRGB(0, 0, (n+1)/2).toHex()
//     let clr = hsbToRGB(0, 0, n).toHex()
//     a.fill = clr

//     r.add(a)
// }

// console.log(r.toSVG())


// let t = new TiledNoise(new RNG(), 11, 4)
// for (let y = 0; y < 10; y++)
// {
//     let s = ""
//     for (let x = 0; x < 20; x++)
//     {
        
//         let h = (t.perm[t.perm[x%t.tileX] + y%t.tileY] %8)*2
//         s = s+" "+h+"/"+(TiledNoise.dirs[h]+TiledNoise.dirs[h+1])
        
//     }
//     console.log(s)
// }
// console.log(IR2, TiledNoise.dirs[14], TiledNoise.dirs[15])
// let T = new TPer(new RNG(), 2, 2)
// for (let x = 0; x < 3; x++)
//     for (let y = 0; y < 3; y++)
//     {
//         let x1 = x % 2
//         let y1 = y % 2
//         let h = T.p[T.p[x1]+y1]
//         h &= 7
//         if (h < 4)
//         {

//         }
//         let u = (h&1)?1: -1
//         let v = (h&2)?1: -1
//         console.log(x, y, h, u, v)
//     }