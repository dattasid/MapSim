export function SVGReset()
{
    Shape.resetId();
    LinearGradient.resetId();
}

export class Stop {
    public col:string;
    public opacity:number = undefined;
    public offset:number;
    constructor(offset:number, col:string, opacity:number = undefined)
    {
        this.offset = offset;
        this.col = col;
        this.opacity = opacity;
    }

    public toSVG():string
    {
        return "<stop stop-color=\""+this.col+"\""
        +((this.opacity != undefined)?" stop-opacity=\""+this.opacity+"\"":"")
        +" offset=\""+this.offset+"\"/>";
    }
}

export abstract class Grad {
    public stops:Stop[] = [];
    public nm:string;

    public isUserSpace:boolean = false;

    constructor()
    {
        this.nm = "unnamed";
    }

    abstract copy():Grad;

    public addStop(offset:number, col:string, opacity:number = undefined)
    {
        this.stops.push(new Stop(offset, col, opacity));
    }

    public abstract toSVG():string;
}

export class LinearGradient extends Grad
{
    static id = 1;

    public x1:number;
    public y1:number;

    public x2:number;
    public y2:number;

    
    constructor(x1:number, y1:number, x2:number, y2:number)
    {
        super();
        this.nm = "LG"+LinearGradient.id;
        LinearGradient.id++;

        this.x1 = x1;
        this.y1 = y1;

        this.x2 = x2;
        this.y2 = y2;
    }

    copy():LinearGradient
    {
        let lg = new LinearGradient(this.x1, this.y1, this.x2, this.y2);
        lg.stops = this.stops;
        lg.isUserSpace = this.isUserSpace;

        return lg;
    }

    public static resetId()
    {
        LinearGradient.id = 0;
    }

    public toSVG():string
    {
        return "<linearGradient id=\""+this.nm+"\" x1=\""+this.x1+"\" x2=\""+this.x2
        +"\" y1=\""+this.y1+"\" y2=\""+this.y2+"\""+ (this.isUserSpace?" gradientUnits=\"userSpaceOnUse\"":"")+">\n"
        +this.stops.map(x=>x.toSVG()).join("\n")
        +"\n</linearGradient>";
    }

}


export abstract class Shape
{
    public cls:string = undefined;
    public trans:string = "";

    public fill:string|Grad = undefined;
    public filter:string = undefined;
    public opacity:number = undefined;

    strokeColor:string|Grad;
    strokeWidth:number;

    clip:Clip;

    private refName:string = undefined;
    private static id = 1;
    nm:string;

    public constructor()
    {
        this.nm = "SHP"+Shape.id;
        Shape.id++; 
    }

    public static resetId()
    {
        Shape.id = 0;
    }

    public toSVGSub():string
    {
        let isFillGrad = (this.fill instanceof Grad);
        return (this.nm!=null ? (" id=\"" + this.nm + "\"") : "")
               + (this.cls ? (" class=\"" + this.cls + "\"") : "")
               + (this.trans.length > 0? (" transform=\"" + this.trans+"\""):"")
               + (this.fill ? (" fill=\"" +
                             (isFillGrad?"url(#"+(<Grad>this.fill).nm+")":this.fill)
                             +"\"") : "")
               + (this.filter ? (" filter=\"url(#" + this.filter + ")\"") : "")
               + (this.opacity ? (" fill-opacity=\"" + this.opacity + "\"") : "")
               + (this.strokeColor ? (" stroke=\"" + this.strokeColor + "\"") : "")
               + (this.strokeWidth ? (" stroke-width=\"" + this.strokeWidth + "\"") : "")
               + (this.opacity && this.strokeColor? (" stroke-opacity=\"" + this.opacity + "\"") : "")
               + (this.clip ? (" clip-path=\"url(#" + this.clip.nm + ")\"") : "")
               ;
    }

    setClip(shp:Shape)
    {
        if (shp == null)
        {
            this.clip = undefined;
            return;
        }
        this.clip = new Clip(shp); 
    }

    public abstract toSVG():string;
    public collectDefs(
        clips:{[nm:string]:Clip},
        shrefs:{[nm:string]:Shape},
        grads:{[nm:string]:Grad})
    {
        if (this.clip)
        {
            clips[this.nm] = this.clip;
            shrefs[this.clip.ref.nm] = this.clip.ref;
        }

        if (this.fill instanceof Grad)
        {
            grads[this.fill.nm] = this.fill;
        }

        if (this.strokeColor instanceof Grad)
        {
            grads[this.strokeColor.nm] = this.strokeColor;
        }

    }

    public translate(x:number, y:number = undefined)
    {
        this.trans += "translate("+x+" "+(y?y:"")+") ";
    }

    public rotate(a:number, x:number = undefined, y:number = undefined)
    {
        this.trans += "rotate("+a+" "+(x?x:"")+" "+(x?y:"")+") ";
    }

    public scale(x:number, y:number = undefined)
    {
        this.trans += "scale("+x+" "+(y?y:"")+") ";
    }
}

export class Clip
{
    private static id1 = 1;
    ref:Shape;
    nm:string;

    public constructor(ref:Shape)
    {
        this.nm = "CC"+Clip.id1;
        Clip.id1++; 

        this.ref = ref;
    }

    public toSVG():string
    {
        let rf = new ShapeRef(this.ref);
        rf.nm=null;
        let s="";
        s+="<clipPath id=\""+this.nm+"\">\n";
        let cren:Shape[] = [];
        Clip.collectChildren(this.ref, cren);
        cren.forEach(c=>{rf.ref = c; s+=rf.toSVG();});
        s+="\n</clipPath>\n";

        return s;
    }

    // Ugly colution to flatten groups for clipping
    private static collectChildren(s:Shape, names:Shape[])
    {
        if (s instanceof SVGGroup)
        {
            s.children.forEach(c=>this.collectChildren(c, names));
        }
        else
            names.push(s);
    }
}

export class SVGGroup extends Shape
{
    children:Shape[] = [];

    public constructor()
    {
        super();
    }

    public add(child:Shape)
    {
        this.children.push(child);
    }

    public collectDefs(
        clips:{[nm:string]:Clip},
        shrefs:{[nm:string]:Shape},
        grads:{[nm:string]:Grad})
    {
        super.collectDefs(clips, shrefs, grads);
        // TODO: for grads!!!
        //if (fill)
        this.children.forEach(x=>x.collectDefs(clips, shrefs, grads));
    }

    public toSVG():string
    {
        let s="<g "+this.toSVGSub()+">\n";
        this.children.forEach(element => {
            s += element.toSVG()+"\n";
        });
        s += "</g>"
        return s;
    }
}

export class SVGRoot extends SVGGroup
{
    defExtra:string;
    attrExtra:string = null
    w:number;
    h:number;
    id:string;

    constructor(w:number, h:number)
    {
        super();
        this.w = w;
        this.h = h;
    }

    public toSVG():string
    {
        let clips:{[nm:string]:Clip} = {};
        let shrefs:{[nm:string]:Shape} = {};
        let grads:{[nm:string]:Grad} = {};
        
        this.collectDefs(clips, shrefs, grads);

        let s="";

        s += "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\""+this.w+"\" height=\""+this.h+"\"";
        if (this.id) s+=" id=\""+this.id+"\"";
        if (this.attrExtra) s += " "+this.attrExtra
        s += ">\n";

        s+="<defs>\n";
        if (this.defExtra) s+=this.defExtra+"\n";

        if (Object.keys(grads).length > 0)
        {
            Object.keys(grads).forEach(
                nm=>{s+=grads[nm].toSVG()+"\n"; /*console.log("CALLED "+nm);*/}
            );
        }

        if (Object.keys(shrefs).length > 0)
        {
            Object.keys(shrefs).forEach(
                nm=>{s+=shrefs[nm].toSVG()+"\n"; /*console.log("CALLED "+nm);*/}
            );
        }
        s+="\n";
        if (Object.keys(clips).length > 0)
        {
            Object.keys(clips).forEach(
                nm=>{
                    s+=clips[nm].toSVG()+"\n";
                }
            );
        }

        // TODO!!! grads
        s+="</defs>\n";

        s += super.toSVG();

        s += "\n</svg>";

        return s;
    }


}

export class ShapeRef extends Shape
{
    ref:Shape;

    constructor(ref:Shape)
    {
        super();
        this.ref = ref;
    }

    public collectDefs(
        clips:{[nm:string]:Clip},
        shrefs:{[nm:string]:Shape},
        grads:{[nm:string]:Grad})
    {
        super.collectDefs(clips, shrefs, grads);

        shrefs[this.ref.nm] = this.ref;
    }

     public toSVG():string
     {
         // x="" y=""
         return "<use xlink:href=\"#"+this.ref.nm+"\""+this.toSVGSub()+"/>";
     }
}

export class Rect extends Shape
{
    public x:number;
    public y:number;
    public w:number;
    public h:number;

    constructor(x:number=0, y:number=0, w:number=0, h:number=0, cls:string = undefined)
    {
        super();
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        if (cls && cls.length > 0)
            this.cls = cls;
    }

    public toSVG():string
    {
        return "<rect x=\""+this.x+"\" y=\""+this.y+"\" width=\""+this.w+"\" height=\""+this.h+"\" "+
            this.toSVGSub()
            +" />";
    }

}

export class Circ extends Shape
{
    public cx:number;
    public cy:number;
    public rx:number;
    public ry:number;

    constructor(cx:number, cy:number, r:number, r2:number=undefined, cls:string = undefined)
    {
        super();
        this.cx = cx;
        this.cy = cy;
        this.rx = r;
        this.ry = r2?r2:r;

        if (cls && cls.length > 0)
            this.cls = cls;
    }

    public toSVG():string
    {
        return "<ellipse cx=\""+this.cx+"\" cy=\""+this.cy+"\" rx=\""+this.rx+"\" ry=\""+this.ry+"\" "+
            this.toSVGSub()
            +" />";
    }

}

export class Circle extends Shape
{
    public cx:number;
    public cy:number;
    public r:number;

    constructor(cx:number=0, cy:number=0, r:number=0, cls:string = undefined)
    {
        super();
        this.cx = cx;
        this.cy = cy;
        this.r = r;

        if (cls && cls.length > 0)
            this.cls = cls;
    }

    public toSVG():string
    {
        return "<circle cx=\""+this.cx+"\" cy=\""+this.cy+"\" r=\""+this.r+"\" "+
            this.toSVGSub()
            +" />";
    }

}

export class CPoly extends Shape
{
    x:number[];
    y:number[];

    closed:boolean = true;

    constructor()
    {
        super();
        this.x = [];
        this.y = [];
    }

    public add(x:number, y:number)
    {
        this.x.push(x);
        this.y.push(y);
    }

    public toSVG():string
    {
        if (this.x.length == 0) return "";

        let s = "<path d=\"";
        s += "M "+this.x[0]+","+this.y[0]+" ";

        for (let i = 1; i < this.x.length; i++)
        {
            s += "L "+this.x[i]+","+this.y[i]+" ";
        }

        if (this.closed)
            s+="Z";

        s+="\" "+this.toSVGSub()+"/>";

        return s;
    }

    public static makeRegPoly(n:number, cx:number=0, cy:number=0, r:number=1,
                              rotDeg:number=-90):CPoly
    {
        let ret = new CPoly();

        let ang = Math.PI *2 /n;
        let alpha = rotDeg * Math.PI/180;
        for (let i = 0; i < n; i ++)
        {
            ret.add(
                cx + r * Math.cos(ang*i+alpha),
                cy + r * Math.sin(ang*i+alpha)
            );
        }

        return ret;
    }

}

export class Line extends Shape
{
    closed:boolean = true;

    markerEnd:string

    constructor(public x1:number, public y1:number, public x2:number, public y2:number)
    {
        super();
    }

    public toSVG():string
    {
        let t = this
        let s = `<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}" `
        if (this.markerEnd)
            s += ` marker-end="url(#${this.markerEnd})" `

        s+= this.toSVGSub()+"/>";

        return s;
    }
}

export class LineSegs extends Shape
{
    private x1:number[];
    private y1:number[];

    private x2:number[];
    private y2:number[];

    closed:boolean = true;

    constructor()
    {
        super();
        this.x1 = [];
        this.y1 = [];

        this.x2 = [];
        this.y2 = [];
    }

    public add(x1:number, y1:number,
               x2:number, y2:number
    )
    {
        this.x1.push(x1);
        this.y1.push(y1);

        this.x2.push(x2);
        this.y2.push(y2);
    }

    public toSVG():string
    {
        if (this.x1.length == 0) return "";

        let s = "<path d=\"";

        for (let i = 0; i < this.x1.length; i++)
        {
            s += "M"+this.x1[i]+","+this.y1[i]+ 
                 "L"+this.x2[i]+","+this.y2[i]+" ";
        }

        s+="\" "+this.toSVGSub()+"/>";

        return s;
    }
}

export class SVGText extends Shape
{
    public constructor(public str:string, public x:number,
                        public y:number)
    {
        super();
    }

    
    public toSVG():string
    {
        let s="<text x=\""+this.x+"\" y=\""+this.y+
                        "\" "+this.toSVGSub()+">\n";
        s += this.str
        s += "</text>"
        return s;
    }
}

export function makeStripedRect(x:number, y:number, w:number, h:number,
                                N:number, gapFrac:number, isVert:boolean)
                :SVGGroup
{
    let sum = 0;
    for (let i = 0; i < N; i++)
    {
        if (i > 0)
            sum += gapFrac;
        sum += 1;
    }
    let d = (1+gapFrac)/sum;

    let g = new SVGGroup();
    if (isVert)
    {
        let sw = w/sum;

        for (let i = 0; i < N; i++)
        {
            let x1 = x+ i * d * w;

            let r = new Rect(x1, y, sw, h);

            g.add(r);
        }
    }
    else
    {
        let sh = h/sum;

        for (let i = 0; i < N; i++)
        {
            let y1 = y+ i * d * h;

            let r = new Rect(x, y1, w, sh);

            g.add(r);
        }
    }
    return g;
}

export class Vec2
{
    public constructor(public x:number, public y:number)
    {
        
    }

    len(): number
    {
        return Math.sqrt(this.x*this.x+this.y * this.y)
    }

    perp(): Vec2
    {
        return new Vec2(this.y, -this.x)
    }

    inPlaceUnit()
    {
        let l = this.len();
        this.x/=l
        this.y/=l
    }
}