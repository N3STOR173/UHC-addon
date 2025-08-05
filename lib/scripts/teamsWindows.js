import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { controller, windowController } from "./main";
let sentence = "lore ipsum";
let seleccionMade = false;
let manualSelected = false;
let canceled = false;
let someoneChoosing = false;
let playerChoosing = "lore ipsum";
let concurrentAux = 0;
let playersConfirmed = new Set();
let playersNotConfirmed = new Set();
let playersWithoutTeam = new Set();
let teams = [];
let playersTeam = new Map();
//////////////////////////////////////////////////////CONFIRMATION WINDOW 
//Termina de crear el texto poniendo quien ha confirmado y quien no
function buildBody() {
    let body = sentence + "\n===============================\n";
    if (playersConfirmed.size > 0) {
        body += "\nJugadores confirmados:\n";
        playersConfirmed.forEach(p => {
            body += "- " + p + "\n";
        });
    }
    if (playersNotConfirmed.size > 0) {
        body += "\nJugadores no confirmados:\n";
        playersNotConfirmed.forEach(p => {
            body += "- " + p + "\n";
        });
    }
    return body;
}
function addProposer() {
    sentence = "\nConfiguración de la partida propuesta por " + playerChoosing + "\n\n";
}
//Procesa la seleccion de los jugadores y los quita de la lista de jugadores sin equipo
function processConfirmSelection(player) {
    playersConfirmed.add(player.nameTag);
    playersNotConfirmed.delete(player.nameTag);
    world.sendMessage(player.nameTag + " ha confirmado los ajustes");
    if (playersNotConfirmed.size == 0 && !canceled) {
        if (manualSelected) {
            controller("manualChooseTeams", [teams]);
        }
        windowController("teamsFormed", []);
        world.sendMessage("§2Todos los jugadores han confirmado la configuración de la partida");
        //para reiniciarlo por si se reinicia la partida
        seleccionMade = false;
        manualSelected = false;
        playersConfirmed.clear();
    }
}
//Procesa la cancelacion
function processCancelation(player) {
    seleccionMade = false;
    manualSelected = false;
    playersConfirmed.clear();
    canceled = true;
    concurrentAux++;
    world.sendMessage("§4" + player.nameTag + " ha rechazado la configuración de los equipos propuesta");
}
//Crea la vetana de confirmacion y procesa las respuestas
function confirmationWindow(player) {
    //se construye la ventana de confirmacion
    let body = sentence;
    if (playersWithoutTeam.size == 0) {
        body = buildBody();
    }
    let window = new ActionFormData()
        .title("Equipos")
        .body(body + "\n");
    //si ya ha confirmado se le avisa
    if (playersConfirmed.has(player.nameTag)) {
        window.body(body + "\nYa has confirmado tu selección\n");
    }
    //si no se pone el boton de confirmar
    else {
        window.button("Confirmar");
    }
    //si esta en manual se pone el boton de cambiar de equipo
    if (manualSelected) {
        window.button("Cambiar de equipo");
        //si ademas falta algun jugador por elegir equipo se le avisa
        if (playersWithoutTeam.size > 0) {
            window.body(body + "\n===============================\n"
                + "\nNo se puede confirmar aún, falta algún jugador por elegir equipo\n\n");
        }
    }
    //se pone el boton de cancelar en cualquier caso
    window.button("rechazar");
    const aux = concurrentAux;
    //se muestra la ventana de confirmacion
    window.show(player).then((response) => {
        if (response.selection === 0) { //CONFIRMAR
            if (checkConcurrence(aux, player))
                return;
            processConfirmSelection(player);
        }
        else if (response.selection == 1) { //CAMBIAR EQUIPO / CANCELAR
            if (checkConcurrence(aux, player))
                return;
            if (manualSelected) //CAMBIAR EQUIPO
                selectTeam(player);
            else { //CONFIRMAR
                processCancelation(player);
            }
        }
        else if (response.selection == 2) { //CANCELAR
            if (checkConcurrence(aux, player))
                return;
            processCancelation(player);
        }
    });
}
//Reinicia todo cuando se selecciona un modo de hacer los equipos
function seleccionConfirmed(player) {
    seleccionMade = true;
    canceled = false;
    playersNotConfirmed.clear();
    playersConfirmed.clear();
    world.getAllPlayers().forEach(p => {
        playersNotConfirmed.add(p.nameTag);
    });
    world.sendMessage("§9" + player.nameTag + " ha propuesto la configuración de la partida, falta la confirmación por parte de los jugadores");
}
//Funcion que comprueba si en mitad de la seleccion han cancelado la configuracion
function checkConcurrence(aux, player) {
    if (aux != concurrentAux) {
        player.runCommand("/title @s actionbar Alguien canceló y no se ha procesado tu selección");
        return true;
    }
    else {
        return false;
    }
}
//////////////////////////////////////////////////////CONFIRMATION WINDOW
//////////////////////////////////////////////////////MANUAL
function buildbodyManual() {
    addProposer();
    for (let i = 0; i < teams.length; i++) {
        sentence += "Equipo " + (i + 1) + ":\n";
        if (teams[i].size == 0) {
            sentence += "Vacío\n";
        }
        for (let p of teams[i]) {
            sentence += "- " + p.nameTag + "\n";
        }
        if (i < teams.length - 1)
            sentence += "\n";
    }
    if (playersWithoutTeam.size > 0) {
        sentence += "\nJugadores sin equipo:\n";
        playersWithoutTeam.forEach((player) => {
            sentence += "- " + player + "\n";
        });
    }
}
function selectTeam(player) {
    let window = new ActionFormData()
        .title("Manual")
        .body(sentence + "\n");
    for (let i = 0; i < teams.length; i++) {
        window.button("Equipo " + (i + 1).toString());
    }
    const aux = concurrentAux;
    window.show(player).then((response) => {
        if (response.canceled) {
            return;
        }
        else {
            if (checkConcurrence(aux, player))
                return;
            if (playersTeam.has(player.nameTag)) { //el jugador ya tenia equipo
                if (response.selection == playersTeam.get(player.nameTag))
                    return;
                world.sendMessage(player.nameTag + " ha elegido el equipo " + (response.selection + 1).toString());
                teams[playersTeam.get(player.nameTag)].delete(player);
                playersConfirmed.forEach((p) => {
                    playersNotConfirmed.add(p);
                });
                playersConfirmed.clear();
                world.sendMessage("Alguien ha cambiado de equipo, vuelve a confirmar la configuración");
                processTeamSelection(response);
                world.getAllPlayers().forEach((p) => {
                    confirmationWindow(p);
                });
            }
            else { //el jugador no tenia equipo
                world.sendMessage(player.nameTag + " ha elegido el equipo " + (response.selection + 1).toString());
                processTeamSelection(response);
                confirmationWindow(player);
            }
        }
    });
    function processTeamSelection(response) {
        //mete al jugador en el equipo seleccionado
        teams[response.selection].add(player);
        //mete en el mapa auxiliar que equipo ha seleccionado
        playersTeam.set(player.nameTag, response.selection);
        //le quita de jugadores sin equipo
        playersWithoutTeam.delete(player.nameTag);
        //vuelve a crear el texto de los equipos
        buildbodyManual();
    }
}
function manualNumberOfTeams(player, numberOfPlayers) {
    let window = new ActionFormData()
        .title("Manual")
        .body("\nElige el número de equipos\n\n");
    for (let i = 0; i < numberOfPlayers; i++) {
        window.button((i + 1).toString());
    }
    window.show(player).then((response) => {
        if (response.canceled) {
            someoneChoosing = false;
            return;
        }
        else {
            teams = [];
            for (let i = 0; i < (response.selection + 1); i++) {
                teams.push(new Set());
            }
            playersWithoutTeam.clear();
            world.getAllPlayers().forEach((player) => {
                playersWithoutTeam.add(player.nameTag);
            });
            playersTeam.clear();
            manualSelected = true;
            seleccionConfirmed(player);
            buildbodyManual();
            world.getAllPlayers().forEach((player) => {
                selectTeam(player);
            });
            someoneChoosing = false;
        }
    });
}
//////////////////////////////////////////////////////MANUAL
//////////////////////////////////////////////////////RANDOM CHOOSE TEAMS
function buildBodyChooseTeams(numberOfPlayers, numberOfTeams) {
    let little = Math.floor(numberOfPlayers / numberOfTeams); //jugadores por equipo
    let nLittle = 0; //número de equipos con un jugador menos
    sentence += "Se ";
    if (numberOfPlayers % numberOfTeams == 0) { //no hay decimales
        nLittle = numberOfTeams;
        if (numberOfTeams == 1) {
            sentence += "generará:\n1 equipo de ";
        }
        else {
            sentence += "generarán:\n" + numberOfTeams + " equipos de ";
        }
        if (little == 1) {
            sentence += "1 miembro\n";
        }
        else {
            sentence += little + " miembros\n";
        }
    }
    else { //hay decimales
        let big = little + 1; //jugadores por equipo + 1
        //se calcula el número de equipos con un jugador más  
        let unidades = Math.trunc(numberOfPlayers / numberOfTeams);
        let decimales = (numberOfPlayers / numberOfTeams) - unidades;
        let nBig = Math.round(decimales * numberOfTeams);
        nLittle = numberOfTeams - nBig;
        if (nLittle == 1) {
            sentence += "generará:\n1 equipo de ";
        }
        else {
            sentence += "generarán:\n" + nLittle + " equipos de ";
        }
        if (little == 1) {
            sentence += "1 miembro\n";
        }
        else {
            sentence += little + " miembros\n";
        }
        //let nBig:number = numberOfTeams - nLittle; 
        if (nBig == 1) {
            sentence += "1 equipo de ";
        }
        else {
            sentence += nBig + " equipos de ";
        }
        sentence += big + " miembros\n";
    }
    return [numberOfTeams, little, nLittle];
}
function randomChooseTeams(player, numPlayers) {
    let randomParams = new ActionFormData()
        .title("Random")
        .body("\nNúmero de equipos\n\n");
    let i = 0;
    while (i < numPlayers && i < 8) {
        randomParams.button((i + 1).toString());
        i++;
    }
    //se muestra la ventana
    randomParams.show(player).then((response) => {
        if (response.canceled) {
            someoneChoosing = false;
            return;
        }
        else {
            let aux = -1;
            if (Number.isInteger(response.selection) && response.selection !== undefined) {
                aux = response.selection;
            }
            addProposer();
            let aux2 = buildBodyChooseTeams(numPlayers, aux + 1);
            controller("randomChooseTeams", aux2);
            seleccionConfirmed(player);
            world.getAllPlayers().forEach((p) => {
                confirmationWindow(p);
            });
            someoneChoosing = false;
        }
    });
}
//////////////////////////////////////////////////////RANDOM CHOOSE TEAMS
//////////////////////////////////////////////////////RANDOM CHOOSE PLAYERS
function buildBodyChoosePlayers(numberOfPlayers, groupSize) {
    sentence += "Se ";
    if (numberOfPlayers / groupSize == 1) {
        sentence += "generará:\n1 equipo de ";
    }
    else {
        sentence += "generarán:\n" + Math.floor(numberOfPlayers / groupSize) + " equipos de ";
    }
    if (groupSize == 1) {
        sentence += "1 miembro\n";
    }
    else {
        sentence += groupSize + " miembros\n";
    }
    if (numberOfPlayers % groupSize > 0) {
        sentence += "1 equipo de ";
        if (numberOfPlayers % groupSize == 1) {
            sentence += "1 miembro\n ";
        }
        else {
            sentence += numberOfPlayers % groupSize + " miembros\n ";
        }
    }
}
function randomChoosePlayers(player, numPlayers) {
    let randomParams = new ActionFormData()
        .title("Random")
        .body("\nNúmero de jugadores por equipo\n\n");
    let first = -1;
    for (let i = 0; i < numPlayers; i++) {
        if (numPlayers / (i + 1) < 9) {
            randomParams.button((i + 1).toString());
            if (first == -1) {
                first = i + 1;
            }
        }
    }
    //se muestra la ventana
    randomParams.show(player).then((response) => {
        if (response.canceled) {
            someoneChoosing = false;
            return;
        }
        else {
            let aux = -1;
            if (Number.isInteger(response.selection) && response.selection !== undefined) {
                aux = response.selection;
            }
            addProposer();
            buildBodyChoosePlayers(numPlayers, first + aux);
            controller("randomChoosePlayers", [(first + aux)]);
            seleccionConfirmed(player);
            world.getAllPlayers().forEach((p) => {
                confirmationWindow(p);
            });
            someoneChoosing = false;
        }
    });
}
//////////////////////////////////////////////////////RANDOM CHOOSE PLAYERS
//////////////////////////////////////////////////////MODE SELECTION
function randomSelectedWindow(player, numberOfPlayers) {
    const form = new ActionFormData()
        .title("Random")
        .button("1. Número de jugadores")
        .button("2. Número de equipos")
        .body("\nElige una de estas dos opciones:\n\n"
        + "1. Número de jugadores:\n"
        + "X número de equipos con los integrantes por equipo que indiques y un último con el resto\n\n"
        + "2. Número de equipos:\n"
        + "Número de equipos que indiques con 1 de diferencia de tamaño\n\n");
    form.show(player).then((response) => {
        if (response.canceled) {
            someoneChoosing = false;
            return;
        }
        else if (response.selection === 0) { //numero de jugadores
            randomChoosePlayers(player, numberOfPlayers);
        }
        else if (response.selection === 1) { //numero de equipos
            randomChooseTeams(player, numberOfPlayers);
        }
    });
}
function selectionWindow(player, numberOfPlayers) {
    const manualOrRandom = new ActionFormData()
        .title("Equipos")
        .body("\nPropón una forma de generar los equipos:\n\n")
        .button("Manual")
        .button("Random");
    manualOrRandom.show(player).then((response) => {
        if (response.canceled) {
            someoneChoosing = false;
            return;
        }
        else if (response.selection === 0) { //selecciona MANUAL
            manualNumberOfTeams(player, numberOfPlayers);
        }
        else if (response.selection === 1) { //selecciona RANDOM
            randomSelectedWindow(player, numberOfPlayers);
        }
    });
}
///////////////////////////
export function startWindow(player) {
    if (seleccionMade) {
        confirmationWindow(player);
    }
    else if (!someoneChoosing) {
        let numberOfPlayers = world.getAllPlayers().length;
        controller("setPlayers", []);
        selectionWindow(player, numberOfPlayers);
        someoneChoosing = true;
        playerChoosing = player.nameTag;
    }
    else {
        const aviso = new ActionFormData()
            .title("Aviso")
            .body("\n" + playerChoosing + " está eligiendo una forma de generar los equipos, espera a que termine");
        aviso.show(player);
    }
}
export function debugSelectionWindow(player) {
    if (seleccionMade) {
        confirmationWindow(player);
    }
    else {
        //ventana para generar jugadores
        const numPlayers = new ModalFormData()
            .textField("Numero de jugadores", "");
        numPlayers.show(player).then((response) => {
            var _a, _b;
            controller("createFakePlayers", [(_a = response.formValues) === null || _a === void 0 ? void 0 : _a[0]]);
            selectionWindow(player, (_b = response.formValues) === null || _b === void 0 ? void 0 : _b[0]);
        });
    }
}
//////////////////////////////////////////////////////MODE SELECTION
//# sourceMappingURL=teamsWindows.js.map