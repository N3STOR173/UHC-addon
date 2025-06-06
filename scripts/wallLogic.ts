import { world, BlockPermutation } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { size, HEIGHT, STARTHEIGHT, DIST, BUILDDIST, BLOCKTYPE  } from "./main";

//Funcion para construir un muro en los dos ejes
//===============================================================================================================
/*
size: distancia a la que se hace el muro
high: altura del muro
startHight: altura desde la que empieza a hacer el muro
buildDist: distancia desde la del jugador a la que se empieza a hacer el muro
sign: signo del muro (1 o -1)
axis: eje en el que se hace el muro (X o Z)
block: material del muro
stableCord: coordenada que se mantiene constante (1000 o -1000)
variableCord: coordenada que va variando (entre -1000 y 1000)
*/
//===============================================================================================================
function buildWall(
  size: number, 
  height: number,
  startHeight: number, 
  buildDist: number,
  axis: string,
  block: string, 
  stableCord: number, 
  variableCord: number,
  ) {
  const dimension = world.getDimension("overworld");

  //distancia desde la del jugador a la que se empieza a hacer el muro
  let variableMin = variableCord - buildDist;
  let variableMax = variableCord + buildDist;
  if (variableMin < -size) 
    variableMin = -size
  if (variableMax > size) 
    variableMax= size

  /*
  Se mira si estamos construyendo un muro X o Z
  Se comprueba desde el rango que se calcula justo antes si faltan secciones verticales del muro
  Si faltan se rellenan
  */
  if (axis === "X") {
    for (let z:number = variableMin; z < variableMax+1; z++) { 
      if (dimension.getBlock({x:stableCord, y:height-1, z})?.typeId !== block) {
        
        for (let y = height-1; y >= startHeight; y--) {
          let blockAux = block;
          if (dimension.getBlock({x:stableCord, y, z})?.typeId !== "minecraft:air")
            blockAux = "minecraft:bedrock";
          dimension.getBlock({x:stableCord, y, z})?.setPermutation(BlockPermutation.resolve(blockAux));
        }
      }
    }
  }
  
  else if (axis === "Z") {
    for (let x:number = variableMin; x < variableMax+1; x++) { 
      if (dimension.getBlock({x, y:height-1, z:stableCord})?.typeId !== block) {
        
        for (let y = height-1; y >= startHeight; y--) {
          let blockAux = block;
          if (dimension.getBlock({x, y, z:stableCord})?.typeId !== "minecraft:air")
            blockAux = "minecraft:bedrock";
          dimension.getBlock({x, y, z:stableCord})?.setPermutation(BlockPermutation.resolve(blockAux));
        }
      }
    }
  }
}

function teleportPlayer(p:any, x:number, z:number, size:number) {
  
  let procede: boolean = false;

  //proceso la X
  if (x > size - 1) {
    x = size - 50;
    procede = true;
  }
  else if (x < -size + 1) {
    x = -size + 50;
    procede = true;
  }
  
  //proceso la Z
  if (z > size - 1) {
    z = size - 50;
    procede = true;
  }
  else if (z < -size + 1) {
    z = -size + 50;
    procede = true;
  }

  //si ha habido un cambio se teletransporta
  if (procede){
    x = Math.floor(x);
    z = Math.floor(z);

    p.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
    p.teleport({x:x, y:320, z:z});
  }
}

export function processPlayer(p: any){

  let location = p.location;
  let x = Math.floor(location.x);
  let z = Math.floor(location.z);

  //se empieza a hacer el muro positivo de x
  if (x > size - DIST) {
    buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "X", BLOCKTYPE, size, z);
  }
  //se empieza a hacer el muro negativo de x
  if ( x < -size + DIST) {
    buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "X", BLOCKTYPE, -size, z);
  }

  //se empieza a hacer el muro positivo de z
  if (z > size - DIST) {
    buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "Z", BLOCKTYPE, size, x);
  }
  //se empieza a hacer el muro negativo de z
  if (z < -size + DIST) {
    buildWall(size, HEIGHT, STARTHEIGHT, BUILDDIST, "Z", BLOCKTYPE, -size, x);
  }

  //Se comprueba por si acaso si el jugador esta fuera del muro
  teleportPlayer(p, x, z, size);

}