import { Player, system, world } from "@minecraft/server";

let start:number;
let end:number;

export function timeMessage(finalSize:number):boolean {
  const currentTime = system.currentTick;
  const players = world.getAllPlayers();

  //aviso mitad del tiempo
  if (currentTime-start == (end - start) / 2) {
    world.sendMessage("Quedan " + Math.floor((((end - start) / 20) / 2)/60) + " minutos para el final de la partida");
    world.sendMessage("Solo recibirán 1 barra de vida extra la gente que llegue a tiempo al centro");
  }
  
  //fin de la partida
  else if (currentTime >= end) {
    for (let p of players) {
      world.sendMessage("Se ha acabado el tiempo");
    }
    return true;
  }

  //aviso distancia al centro
  else if (currentTime-start >= (end - start) * 3 / 4) { 
    for (let p of players) {
      let distx = Math.floor(Math.abs(p.location.x) - finalSize-2); 
      let distz = Math.floor(Math.abs(p.location.z) - finalSize-2);
      
      if (distx > 0 && distz > 0) { //calculo de la diagonal
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
          + "| Distancia: " + Math.floor(Math.sqrt(distx*distx + distz*distz)) + " b");
      }

      else if (distx > 0) { //calculo distancia x
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
        + "| Distancia : " + distx + " b");
      }

      else if (distz > 0) { //calculo distancia z
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
        + "| Distancia: " + distz + " b");
      }

      else {
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
        + "| Dentro de la zona");
      }
    }
  }

  //aviso de tiempo restante
  else {
    for (let p of players) {
      p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m ");
    }
  }
  return false;
}

export function setTime(startTime:number, endTime:number) {
  start = startTime;
  end = endTime;
}