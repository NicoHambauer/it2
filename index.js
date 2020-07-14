function initialisiere() {
    
    // Data Picker Initialization
    let rawData = []
    rawData.push(d3.json("https://it2wi1.if-lab.de/rest/ft_ablauf"));
    Promise.all(rawData).then((data) => preprocess_rawData(data), function (error) {
        console.log(error);
    });

    
}

function aktualisiereSeite(data) {
    preprocess_rawData([data]); 
}


function preprocess_rawData(rawData, error) {
    let valueToComulate = ["H-vertikal", "H-horizontal", "V-vertikal", "V-drehen", "V-horizontal"];
    let valueForAmpel = ["Ampel rot", "Ampel orange", "Ampel gruen", "Ampel weiss"];

    let valueOfenBearbeitung = ["B-Motor Drehkranz im Uhrzeigersinn", "B-Motor Drehkranz gegen Uhrzeigersinn"];
    let valueOfenRausRein = ["B-Motor Ofenschieber Einfahren", "B-Motor Ofenschieber Ausfahren"];


    let valueToCountOnTime = ["B-Motor Saege", "B-Motor Sauger zum Ofen", "B-Motor Sauger zum Drehkranz", "B-Motor Foerderband vorwaerts", "S-Motor Foerderband"]; // Bearbeitungsstation motoren sowie fliessbaender


    let countdictionary = {};
    if (error) {
        console.log(error);
    }


    //cumulatedDistanceOverTime ist ein dictionary mit key: name des sensors val: wiederum dictionary mit datum: .... wert: kumulierte wegstrecke bis dahin
    let cumulatedValueOverTime = valueToComulate.map(function (key) { // fuer jeden sensor der zu kumulierende wegstrecken beinhaltet do
        let currentValue = 0;// variable zum zwischenspeicher der bisherigen kumulierten wegstrecke für diesen key
        return {
            name: key,
            werte: rawData[0].map(function (data) {
                currentValue += parseInt(data.werte[key]);
                return { datum: data.datum, wert: currentValue };
            })
        }
    });

    let bereinigte_cumulatedValueOverTime = bereinigeKumulierteWegstreckenachEinheit(cumulatedValueOverTime, "H-horizontal", 78, 6) // in cm// dict, name des sensors, teiler (1cm entspricht teiler), einheit
    bereinigte_cumulatedValueOverTime = bereinigeKumulierteWegstreckenachEinheit(bereinigte_cumulatedValueOverTime, "H-vertikal", 78, 8) // in cm
    bereinigte_cumulatedValueOverTime = bereinigeKumulierteWegstreckenachEinheit(bereinigte_cumulatedValueOverTime, "V-vertikal", 78, 2) // in cm
    bereinigte_cumulatedValueOverTime = bereinigeKumulierteWegstreckenachEinheit(bereinigte_cumulatedValueOverTime, "V-drehen", 2264) // in Anzahl Umdrehungen
    bereinigte_cumulatedValueOverTime = bereinigeKumulierteWegstreckenachEinheit(bereinigte_cumulatedValueOverTime, "V-horizontal", 67) // in Anzahl Umdrehungen


    //console.log(cumulatedValueOverTime)
    //console.log(bereinigte_cumulatedValueOverTime);


    // addiere alle Anzahl der Statusänderungen sowie kumuliere alle wegstrecken um pro sensor ein 
    // key: name des sensors val: wert am ende der zeiteinheit (in Anzahl Statusänderungen oder kumulierte wegstrecke in cm) zu erhalten 
    i = 0;
    rawData[0].forEach(zeitpunkt => {
        for (const [key, val] of Object.entries(zeitpunkt.werte)) {
            if (!countdictionary.hasOwnProperty(key)) {//Initialisierung
                if (valueOfenRausRein.includes(key)) {
                    if (val == " true") {
                        countdictionary["B-Motor Ofenschieber RausRein"] = 5; //in CM
                       
                    } else if (val == " false"){
                        countdictionary["B-Motor Ofenschieber RausRein"] = 0;
                    }
                    countdictionary["B-Motor Ofenschieber Einfahren"] = -1; //verwendet um initialisierung der neuen variable raus rein anzuzeigen
                    countdictionary["B-Motor Ofenschieber Ausfahren"] = -1; //verwendet um initialisierung der neuen variable raus rein anzuzeigen
                } else if (valueOfenBearbeitung.includes(key)) {
                    if (val == " true") {
                        countdictionary["B-Motor Drehkranz Bearbeitung"] = 19.1; //in CM
                    } else if (val == " false"){
                        countdictionary["B-Motor Drehkranz Bearbeitung"] = 0;
                    }
                    countdictionary["B-Motor Drehkranz im Uhrzeigersinn"] = -1;//verwendet um initialisierung der neuen variable raus rein anzuzeigen
                    countdictionary["B-Motor Drehkranz gegen Uhrzeigersinn"] = -1;//verwendet um initialisierung der neuen variable raus rein anzuzeigen

                } else if (valueToCountOnTime.includes(key)) {
                    if (val == " true") {
                        countdictionary[key] = 1
                    } else {
                        countdictionary[key] = 0
                    }
                } else if (val == " true") {
                    countdictionary[key] = 1

                } else if (val == " false") {
                    countdictionary[key] = 0

                }
            } else {
                if (valueForAmpel.includes(key)) {
                    if (val == " true") {
                        countdictionary[key] += 1;
                    }
                } else if (valueOfenRausRein.includes(key)) {// Ofen raus rein
                    if (val == " true") {
                        countdictionary["B-Motor Ofenschieber RausRein"] = (parseFloat(countdictionary["B-Motor Ofenschieber RausRein"]) + 5).toFixed(1); //in CM
                    }
                } else if (valueOfenBearbeitung.includes(key)) {// Ofen Bearbeitung
                    if (val == " true") {
                        countdictionary["B-Motor Drehkranz Bearbeitung"] = (parseFloat(countdictionary["B-Motor Drehkranz Bearbeitung"]) + 19.1).toFixed(1);// in CM
                    }
                } else if (valueToCountOnTime.includes(key)) {
                    if (val == " true") {
                        countdictionary[key] += 1
                    }
                } else if ((rawData[0][i - 1].werte[key]) != val) {
                    countdictionary[key] += 1
                }
            }
        }
        i++;
    });



    liste = [];

    //Liste Ampel
    listeAmpelrot = ["Ampel rot"]
    listeAmpelorange = ["Ampel orange"]
    listeAmpelgruen = ["Ampel gruen"]
    listeAmpelweiss = ["Ampel weiss"]

    //Listen von Modul Fischertechnik
    listeHochregalFi = ["Referenztaster horizontal", "Referenztaster vertikal", "Referenztaster Ausleger vorne", "Referenztaster Ausleger hinten", "Lichtschranke innen", "Lichtschranke aussen"];
    listeVerteilstationFi = ["V-Referenzschalter vertikal", "V-Referenzschalter horizontal", "V-Referenzschalter drehen"]
    listeBearbeitungsstationFi = ["B-Leuchte Ofen", "B-Referenzschalter Drehkranz (Pos. Sauger)", "B-Referenzschalter Drehkranz (Pos. Foerderband)", "B-Lichtschranke Ende Foerderband", "B-Referenzschalter Drehkranz (Pos. Saege)", "B-Referenzschalter Sauger (Pos. Drehkranz)", "B-Referenzschalter Ofenschieber Innen", "B-Referenzschalter Ofenschieber Aussen", "B-Referenzschalter Sauger (Pos. Brennofen)", "B-Lichtschranke Brennofen"]
    listeSortierstationFi = ["S-Lichtschranke Eingang", "S-Lichtschranke nach Farbsensor", "S-Lichtschranke weiss", "S-Lichtschranke rot", "S-Lichtschranke blau"]
    //kumulierte wegstrecke
    listeComulateHochregallager = ["H-vertikal", "H-horizontal"];
    listeComulateVerteilstation = ["V-vertikal", "V-horizontal"];
    listeUmdrehungenVerteilstation = ["V-drehen"];

    listeOfenBearbeitungUndRausRein = ["B-Motor Drehkranz Bearbeitung", "B-Motor Ofenschieber RausRein"];
   
    //Motorenlaufzeit
    listeToCountOnTimeBearbeitungsstation = ["B-Motor Saege", "B-Motor Sauger zum Ofen", "B-Motor Sauger zum Drehkranz", "B-Motor Foerderband vorwaerts"]; // Bearbeitungsstation motoren sowie fliessbaender
    listeToCountOnTimeSortierstation = ["S-Motor Foerderband"];

    //Listen von Modul Festo
    listeFesto = ["Umsetzer Endanschlag 1 (3B1)", "Umsetzer Endanschlag 2 (3B2)"]

    for (const [key, val] of Object.entries(countdictionary)) {
        liste.push({ key, val })
    }

    let mapHochregalFi = mapModule(listeHochregalFi, liste);//Fischertechnik
    let mapVerteilstationFi = mapModule(listeVerteilstationFi, liste);
    let mapBearbeitungsstationFi = mapModule(listeBearbeitungsstationFi, liste);
    let mapSortierstationFi = mapModule(listeSortierstationFi, liste);
    let mapFesto = mapModule(listeFesto, liste);//Festo
    
    //textuelleaenderungen  anzeigen
    aktualisiereListe(mapHochregalFi, "hochregallager");
    aktualisiereListe(mapVerteilstationFi, "verteilstation");
    aktualisiereListe(mapBearbeitungsstationFi, "bearbeitungsstation");
    aktualisiereListe(mapSortierstationFi, "sortierstation");
    //diagramme anzeigen
    zeigeDiagram(mapHochregalFi, "hochregallagerG");
    zeigeDiagram(mapVerteilstationFi, "verteilstationG");
    zeigeDiagram(mapBearbeitungsstationFi, "bearbeitungsstationG");
    zeigeDiagram(mapSortierstationFi, "sortierstationG");
    
    //console.log(bereinigte_cumulatedValueOverTime)
    //kumulierte wegstrecken und umdrehungen teile die sensoren nach modulen auf
    let mapHochregalWegstrecken = mapModule(listeComulateHochregallager, bereinigte_cumulatedValueOverTime);
    let mapVerteilstationWegstrecken = mapModule(listeComulateVerteilstation,bereinigte_cumulatedValueOverTime);
    let mapVerteilstationUmdrehungen = mapModule(listeUmdrehungenVerteilstation, bereinigte_cumulatedValueOverTime);
    let mapOfenBearbeitungUndRausReinWegstrecke = mapModule(listeOfenBearbeitungUndRausRein, liste);

    //console.log(bereinigte_cumulatedValueOverTime)
    //console.log(mapHochregalWegstrecken)
    //aktualisiere textuelle anzeige der kumulierten wegstrecken und umdrehungen
    aktualisiereListeComulate(mapHochregalWegstrecken, "hochregallager_comulate", "cm")
    aktualisiereListeComulate(mapVerteilstationWegstrecken, "verteilstation_comulate", "cm")
    aktualisiereListeComulate(mapVerteilstationUmdrehungen, "verteilstation_umdrehungen_schwenkarm", "Umdrehungen")
    aktualisiereListe(mapOfenBearbeitungUndRausReinWegstrecke, "bearbeitungsstation_cumulate", " cm")
    
    //motorenlaufzeit
    let mapBearbeitungsstationMotorenlaufzeit = mapModule(listeToCountOnTimeBearbeitungsstation, liste);
    let mapSortierstationMotorenlaufzeit = mapModule(listeToCountOnTimeSortierstation, liste);

    aktualisiereListe(mapBearbeitungsstationMotorenlaufzeit, "bearbeitungsstation_motorenlaufzeit", " sek")
    aktualisiereListe(mapSortierstationMotorenlaufzeit, "sortierstation_motorenlaufzeit", " sek")

    //Ampel
    let mapAmpelrot = mapModule(listeAmpelrot, liste);
    let mapAmpelorange = mapModule(listeAmpelorange, liste);
    let mapAmpelgruen = mapModule(listeAmpelgruen, liste);
    let mapAmpelweiss = mapModule(listeAmpelweiss, liste);
    //ampel anzeigen
    let gesamtAmpelZyklen = rawData[0].length;
    aktualisiereAmpel(mapAmpelrot, "lightred", gesamtAmpelZyklen);
    aktualisiereAmpel(mapAmpelorange, "lightyellow", gesamtAmpelZyklen);
    aktualisiereAmpel(mapAmpelgruen, "lightgreen", gesamtAmpelZyklen);
    aktualisiereAmpel(mapAmpelweiss, "lightwhite", gesamtAmpelZyklen);
}

function aktualisiereListeComulate(listeModul, targetID, einheit) {

    id = "#" + targetID;
    //Rückgabe der d3.selectAll - Methode in variable p speichern.(Alle Kindelemente von content, die p- Elemente sind.) Am Anfang gibt es noch keine.
    d3.select(id).selectAll("*").remove();
    let d = d3.select(id).selectAll("li").data(listeModul);
    //console.log(d)
    //console.log(countTaster)
    //.enter().append(): Daten hinzufuegen falls es mehr Daten als Elemente im HTML gibt.
    //geschieht hier für jede Zeile von daten.
    d.enter().append("li")
        .text(function (listeModul) {
            return listeModul.name + ": " + listeModul.werte[listeModul.werte.length - 1].wert + " " + einheit;
        });
    //.exit().remove(): Daten löschen, falls es mehr Elemente im HTML als Daten gibt.
    d.exit().remove();
}

function bereinigeKumulierteWegstreckenachEinheit(cumulatedValueOverTime, nameDesSensors, teiler) {
    let bereinigte_CumulatedValueOverTime = cumulatedValueOverTime.map(function (datarow) {
        if (datarow.name == nameDesSensors) {
            return {
                name: datarow.name,
                werte: datarow.werte.map(function (data) {
                    return { datum: data.datum, wert: (parseInt(data.wert) / teiler).toFixed(1) };// rundet auf 1 nachkommastelle den neuen wert genau
                })
            }
        } else {
            return datarow;
        }
    });
    return bereinigte_CumulatedValueOverTime;
}

function zeigeDiagram(liste, targetid) {

    console.log(liste)
    liste = liste.filter(function(x){

        if (x.val == 0){
            return false;
        }
        return true;
    });
    console.log(liste)
    id = "#" + targetid;
    d3.select(id).selectAll("*").remove();

    //console.log(liste)
    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = 400 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // set the ranges
    var x = d3.scaleBand()
        .range([0, width])
        .padding(0.7);
    var y = d3.scaleLinear()
        .range([height, 0]);
    var xachsenwerte = d3.scaleBand().range([0, width]).padding(0.5)


    let svg = d3.select(id).append("svg")//Auf Webseite
        .attr("width", width + margin.left + margin.right) //+vw
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");


    // Scale the range of the data in the domains
    x.domain(liste.map(function (d) { return d.key; }));
    y.domain([0, d3.max(liste, function (d) { return d.val; })]);

    // append the rectangles for the bar chart
    var bars =  svg.selectAll(".bar").data(liste);
   
        bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", function (d) { return x(d.key); })

        .attr("width", 12)//x.bandwidth()
        .attr("y", function (d) { return y(d.val); })
        .attr("height", function (d) { return height - y(d.val); })
        .style("fill", "rgb(189, 189, 189)");

    bars.exit().remove();
    
    
    //
    var balkenText = svg.selectAll(".balkentext").data(liste);

    balkenText.enter().append("text")
        .attr("class", "balkentext")
        .attr("x", -250)
        .attr("y", function (d) { return x(d.key); })
        .text(function (d) { return d.key; })

        .attr("transform", "rotate(-90)")
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px")
        


    balkenText.exit().remove();

    // add the x Axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xachsenwerte));

    // add the y Axis
    svg.append("g")
        .call(d3.axisLeft(y));


}

function mapModule(listeModul, listeGlobal) {
    let filteredListe = listeGlobal.map(function (d) {
        if (listeModul.includes(d.key) || listeModul.includes(d.name)) { //name war noetig weil ich in der zweiten liste comulate name statt key verwendet habe...
            return (d);
        }
    }).filter(function (x) {
        return x !== undefined;
    });
    return filteredListe;
}

function aktualisiereListe(listeModul, targetID, einheit) {

    id = "#" + targetID;
    d3.select(id).selectAll("*").remove();
    //Rückgabe der d3.selectAll - Methode in variable p speichern.(Alle Kindelemente von content, die p- Elemente sind.) Am Anfang gibt es noch keine.
    let d = d3.select(id).selectAll("li").data(listeModul);
    //console.log(d)
    //console.log(countTaster)
    //.enter().append(): Daten hinzufuegen falls es mehr Daten als Elemente im HTML gibt.
    //geschieht hier für jede Zeile von daten.
    d.enter().append("li")
        .text(function (listeModul) {
            if(einheit == undefined){
                return listeModul.key + ": " + listeModul.val;
            } else {
                return listeModul.key + ": " + listeModul.val + einheit;
            }
        });
    //.exit().remove(): Daten löschen, falls es mehr Elemente im HTML als Daten gibt.
    d.exit().remove();
    //console.log(countTaster[0])
}


function aktualisiereAmpel(listeModul, targetID, gesamtAmpelZyklen) {
    id = "#" + targetID;
    d3.select(id).selectAll("*").remove();
    //Rückgabe der d3.selectAll - Methode in variable p speichern.(Alle Kindelemente von content, die p- Elemente sind.) Am Anfang gibt es noch keine.
    let d = d3.select(id).selectAll("p").data(listeModul);

    //.enter().append(): Daten hinzufuegen falls es mehr Daten als Elemente im HTML gibt.
    //geschieht hier für jede Zeile von daten.
    d.enter().append("p")
        .attr("class", "percentage")
        .text(function (listeModul) {
            return Math.round(listeModul.val / gesamtAmpelZyklen * 100) + "%";
        })
    //.exit().remove(): Daten löschen, falls es mehr Elemente im HTML als Daten gibt.
    d.exit().remove();
    //console.log(countTaster[0])
}



