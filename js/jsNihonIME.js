/**
 * Copyright (c) 2007, 2011, Fernando Lucchesi Bastos Jurema
 * This code is under the MIT license: http://creativecommons.org/licenses/MIT/deed.en
 *
 * http://www.students.ic.unicamp.br/~ra091187/
 * fernandolbastos [at] gmail [dot] com
 *
 * This virtual keyboard is free software.
 * Basically, you can use, copy, modify and distribute it in any way.
 */

/**
 * The kanji information was taken from Taka:
 * http://sourceforge.net/projects/taka/
 */


/**
 * HOW TO USE:
 *
 * First, put the following code at the <home> tag of your page:
 *
 *

<!-- JavaScript code that does all the work -->
<script type="text/JavaScript" src="tecladojapones.js"></script>
<!-- Defining the size of the buttons and of the div that will hold them -->
<style type="text/css"> #divbuttons{width: 520px;} .btn {width: 28px;} </style>

 *
 *
 * then, put this were you want the keyboard to be rendered:
 *
 *

<!-- Combobox to select the buttons -->
<select name="chars" size="1" onchange="changebuttons(this);">
	<option>Hiragana</option>
	<option>Katakana</option>
	<option>Jouyou Kanji - 1</option>
	<option>Jouyou Kanji - 2</option>
	<option>Jouyou Kanji - 3</option>
	<option>Jouyou Kanji - 4</option>
	<option>Jouyou Kanji - 5</option>
	<option>Jouyou Kanji - 6</option>
	<option>Jouyou Kanji - 7</option>
	<option>No buttons</option>
</select><br />

<!-- div that will hold the buttons -->
<div id="divbuttons"></div>

<!-- Textarea -->
<textarea id="k_textarea" rows="12" cols="60"  onkeydown="javascript:replacekana();" onkeyup="javascript:replacekana();"></textarea><br />

 *
 *
 * and that's all!
 *
 * You are free to change the text of the combobox, as the code
 * will only consider the position of the option.
 *
 *
 * If you want, you can just put all the code together, but it's not
 * good practice(i.e. your page will not validate at W3C).
 *
 * The kanji will not work offline, as the xml can only be read in http.
 */

/*
 * TO DO:
 * Deal with the massive amount of kanji at the higher levels...
 */

/**
 * BEGIN CODE:
 */


/**
 * Defines wich button category will be shown at the beginning.
 * Uncomment the desired line(and comment the other) to change it.
 * Comment all of them for no buttons.
 */
//window.onload = hiragana;
//window.onload = katakana;
//window.onload = kanji(1); // Change the number to select the level


// Temporary variable that keeps the buttons code
// (for efficiency, changing the div's code directly is too slow)
var Buttons_tmp="";


/* Function that renders a kanji button */
function kanji_btn(symbol, meaning, on_yomi, kun_yomi)
{
	// Model: <input class=\"btn\" type="button" value="&#26085;" title="Sol, dia (hi)" onclick="javascript:add('&#26085;')">
	Buttons_tmp +=
		'<input class="btn" type="button" value="' + symbol +
		'" title="' + meaning +
		'\nO: ' + on_yomi +
		'\nK: ' + kun_yomi +
		'" onclick="javascript:add(\'' + symbol + '\')">\n';
}


/* Function that adds the button symbol to the textarea */
function add(symbol)
{
	document.getElementById("answer-input").value += symbol;
}


/* Function that changes the buttons according to the combobox */
function changebuttons(sel)
{
	switch(sel.selectedIndex)
	{
		case 0:
			hiragana();
			break;
		case 1:
			katakana();
			break;
		case 9:
			// No buttons
			document.getElementById("divbuttons").innerHTML = "";
			break;
		default:
			kanji(sel.selectedIndex - 1);
			break;
	}
}


/* Function that renders the kanji buttons of the chosen level */
var kanjiData;

function kanji(lvl)
{
	// Empties the temporary string
	Buttons_tmp = "";

	if (!kanjiData) {
		// Opens the xml file containign the kanji
		if (window.XMLHttpRequest)
		{// code for IE7+, Firefox, Chrome, Opera, Safari
			xmlhttp=new XMLHttpRequest();
		}
		else
		{// code for IE6, IE5
			xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
		}
		xmlhttp.open("GET","js/kanji.xml",false);
		xmlhttp.send();
		kanjiData=xmlhttp.responseXML;
	}

	// Gets the kanji of that level
	kanji_list = kanjiData.getElementsByTagName("category")[lvl-1].getElementsByTagName("kanji");

	const result = [];
	// For each kanji
	for (i=0; i < kanji_list.length; i++)
	{
		// Gets its data
		kanji_char = kanji_list[i].getElementsByTagName("char")[0].childNodes[0].nodeValue;
		meaning = kanji_list[i].getElementsByTagName("meaning")[0].childNodes[0].nodeValue;
		on_list = kanji_list[i].getElementsByTagName("on");
		kun_list = kanji_list[i].getElementsByTagName("kun");

		// Strings that will hold the readings
		on = "";
		kun = "";

		// Gets the readings, separated by commas
		for (j=0; j < on_list.length; j++)
		{
			// &#12289; = japanese comma
			if( on == "" )
				on = on_list[j].childNodes[0].nodeValue;
			else
				on = on + "," + on_list[j].childNodes[0].nodeValue;
		}
		for (j=0; j < kun_list.length; j++)
		{
			if( kun == "" )
				kun = kun_list[j].childNodes[0].nodeValue;
			else
				kun = kun + "," + kun_list[j].childNodes[0].nodeValue;
		}

		result.push({char: kanji_char, meaning: meaning, on: on, kun: kun});
		// Generates the button code onto the tmp string
		kanji_btn(kanji_char, meaning, on, kun);
	}

	// Draws the buttons inside the div
	const divButtons = document.getElementById("divbuttons");
	if (divButtons) {
		divButtons.innerHTML = Buttons_tmp;
	}
	return result;
}


/* Function that renders a kana button */
function kana(symbol, reading)
{
	Buttons_tmp +=
		'<input class="btn" type="button" value="' + symbol +
		'" title="' + reading +
		'" onclick="javascript:add(\'" + symbol + "\')">\n';
}


/* Auxiliary functions, for formatting */
function br() { Buttons_tmp += "<br />"; }
function nbsp2() { Buttons_tmp += "&nbsp;&nbsp;"; }


/* Function that renders the hiragana buttons */
function hiragana()
{
	// Empties the temporary string
	Buttons_tmp = "";

	kana("&#12354;", "a"); kana("&#12356;", "i"); kana("&#12358;", "u"); kana("&#12360;", "e"); kana("&#12362;", "o");
	nbsp2();
	kana("&#12363;", "ka"); kana("&#12365;", "ki"); kana("&#12367;", "ku"); kana("&#12369;", "ke"); kana("&#12371;", "ko");
	nbsp2()
	kana("&#12373;", "sa"); kana("&#12375;", "shi"); kana("&#12377;", "su"); kana("&#12379;", "se"); kana("&#12381;", "so");
	br();
	kana("&#12383;", "ta"); kana("&#12385;", "chi"); kana("&#12388;", "tsu"); kana("&#12390;", "te"); kana("&#12392;", "to");
	nbsp2();
	kana("&#12394;", "na"); kana("&#12395;", "ni"); kana("&#12396;", "nu"); kana("&#12397;", "ne"); kana("&#12398;", "no");
	nbsp2();
	kana("&#12399;", "ha"); kana("&#12402;", "hi"); kana("&#12405;", "fu"); kana("&#12408;", "he"); kana("&#12411;", "ho");
	br();
	kana("&#12414;", "ma"); kana("&#12415;", "mi"); kana("&#12416;", "mu"); kana("&#12417;", "me"); kana("&#12418;", "mo");
	nbsp2();
	kana("&#12425;", "ra"); kana("&#12426;", "ri"); kana("&#12427;", "ru"); kana("&#12428;", "re"); kana("&#12429;", "ro");
	nbsp2();
	kana("&#12364;", "ga"); kana("&#12366;", "gi"); kana("&#12368;", "gu"); kana("&#12370;", "ge"); kana("&#12372;", "go");
	br();
	kana("&#12374;", "za"); kana("&#12376;", "ji"); kana("&#12378;", "zu"); kana("&#12380;", "ze"); kana("&#12382;", "zo");
	nbsp2();
	kana("&#12384;", "da"); kana("&#12376;", "ji"); kana("&#12389;", "(zu)"); kana("&#12391;", "de"); kana("&#12393;", "do");
	nbsp2();
	kana("&#12400;", "ba"); kana("&#12403;", "bi"); kana("&#12406;", "bu"); kana("&#12409;", "be"); kana("&#12412;", "bo");
	br();
	kana("&#12401;", "pa"); kana("&#12404;", "pi"); kana("&#12407;", "pu"); kana("&#12410;", "pe"); kana("&#12413;", "po");
	nbsp2();
	kana("&#12353;", "'a"); kana("&#12355;", "'i"); kana("&#12357;", "'u"); kana("&#12359;", "'e"); kana("&#12361;", "'o");
	nbsp2();
	kana("&#12420;", "ya"); kana("&#12422;", "yu"); kana("&#12424;", "yo");
	br();
	kana("&#12419;", "'ya"); kana("&#12421;", "'yu"); kana("&#12423;", "'yo");
	nbsp2();
	kana("&#12431;", "wa"); kana("&#12434;", "(w)o"); kana("&#12435;", "n");

	const divButtons = document.getElementById("divbuttons");
	if (divButtons) {
		divButtons.innerHTML = Buttons_tmp;
	}
}


/* Function that renders the katakana buttons */
function katakana()
{
	// Empties the temporary string
	Buttons_tmp = "";

	kana("&#12450;", "a"); kana("&#12452;", "i"); kana("&#12454;", "u"); kana("&#12456;", "e"); kana("&#12458;", "o");
	nbsp2();
	kana("&#12459;", "ka"); kana("&#12461;", "ki"); kana("&#12463;", "ku"); kana("&#12465;", "ke"); kana("&#12467;", "ko");
	nbsp2();
	kana("&#12469;", "sa"); kana("&#12471;", "shi"); kana("&#12473;", "su"); kana("&#12475;", "se"); kana("&#12477;", "so");
	br();
	kana("&#12479;", "ta"); kana("&#12481;", "chi"); kana("&#12484;", "tsu"); kana("&#12486;", "te"); kana("&#12488;", "to");
	nbsp2();
	kana("&#12490;", "na"); kana("&#12491;", "ni"); kana("&#12492;", "nu"); kana("&#12493;", "ne"); kana("&#12494;", "no");
	nbsp2();
	kana("&#12495;", "ha"); kana("&#12498;", "hi"); kana("&#12501;", "fu"); kana("&#12504;", "he"); kana("&#12507;", "ho");
	br();
	kana("&#12510;", "ma"); kana("&#12511;", "mi"); kana("&#12512;", "mu"); kana("&#12513;", "me"); kana("&#12514;", "mo");
	nbsp2();
	kana("&#12521;", "ra"); kana("&#12522;", "ri"); kana("&#12523;", "ru"); kana("&#12524;", "re"); kana("&#12525;", "ro");
	nbsp2();
	kana("&#12460;", "ga"); kana("&#12462;", "gi"); kana("&#12464;", "gu"); kana("&#12466;", "ge"); kana("&#12468;", "go");
	br();
	kana("&#12470;", "za"); kana("&#12472;", "ji"); kana("&#12474;", "zu"); kana("&#12476;", "ze"); kana("&#12478;", "zo");
	nbsp2();
	kana("&#12480;", "da"); kana("&#12472;", "ji"); kana("&#12485;", "(zu)"); kana("&#12487;", "de"); kana("&#12489;", "do");
	nbsp2();
	kana("&#12496;", "ba"); kana("&#12499;", "bi"); kana("&#12502;", "bu"); kana("&#12505;", "be"); kana("&#12508;", "bo");
	br();
	kana("&#12497;", "pa"); kana("&#12500;", "pi"); kana("&#12503;", "pu"); kana("&#12506;", "pe"); kana("&#12509;", "po");
	nbsp2();
	kana("&#12449;", "'a"); kana("&#12451;", "'i"); kana("&#12453;", "'u"); kana("&#12455;", "'e"); kana("&#12457;", "'o");
	nbsp2();
	kana("&#12516;", "ya"); kana("&#12518;", "yu"); kana("&#12520;", "yo");
	br();
	kana("&#12515;", "'ya"); kana("&#12517;", "'yu"); kana("&#12519;", "'yo");
	nbsp2();
	kana("&#12527;", "wa"); kana("&#12530;", "(w)o"); kana("&#12531;", "n");

	const divButtons = document.getElementById("divbuttons");
	if (divButtons) {
		divButtons.innerHTML = Buttons_tmp;
	}
}


/* Function that replaces the roman letters for their corresponding kana */
function replacekana(charset, quizType) {
    const answerInput = document.getElementById("answer-input");
    if (!answerInput) return;

    let inputText = answerInput.value;
    let convertedText;

    const wanakanaOptions = {
        customKanaMapping: {
            shi: 'し', si: 'し',
            chi: 'ち', ti: 'ち',
            tsu: 'つ', tu: 'つ',
            ji: 'じ', zi: 'じ',
            fu: 'ふ', hu: 'ふ'
        }
    };

    if (quizType === 'katakana') {
        convertedText = wanakana.toKatakana(inputText, wanakanaOptions);
    } else {
        convertedText = wanakana.toHiragana(inputText, wanakanaOptions);
    }

    if (answerInput) {
        answerInput.value = convertedText;
    }

    // Kanji suggestions
    const suggestions = getKanjiSuggestions(inputText, charset);
    let suggestionsContainer = document.getElementById('kanji-suggestions-card');

    // Hide suggestions if the only suggestion is the same as the input
    if (suggestions.length === 1 && suggestions[0] === inputText) {
        if (suggestionsContainer) {
            suggestionsContainer.remove();
        }
        return;
    }

    if (suggestions.length > 0) {
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'kanji-suggestions-card';
            suggestionsContainer.className = 'card shadow border-primary';
            suggestionsContainer.style.position = 'fixed';
            suggestionsContainer.style.bottom = '10px';
            suggestionsContainer.style.right = '10px';
            suggestionsContainer.style.width = '300px';
            suggestionsContainer.style.zIndex = '1050';
            suggestionsContainer.style.maxHeight = '33vh';
            suggestionsContainer.style.overflowY = 'auto';
            document.body.appendChild(suggestionsContainer);
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'd-flex flex-wrap gap-2';
        suggestions.forEach(suggestion => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.style.fontFamily = "'Noto Sans JP Embedded', sans-serif";
            button.textContent = suggestion;
            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            button.onclick = () => {
                // Replace the typed text with the selected suggestion
                answerInput.value = answerInput.value.slice(0, -inputText.length) + suggestion;
                if (suggestionsContainer) {
                    suggestionsContainer.remove();
                }
                // After inserting, hide the suggestions
                const stillExists = document.getElementById('kanji-suggestions-card');
                if (stillExists) {
                    stillExists.remove();
                }
            };
            buttonGroup.appendChild(button);
        });

        cardBody.appendChild(buttonGroup);
        suggestionsContainer.innerHTML = ''; // Clear previous content
        suggestionsContainer.appendChild(cardBody);
    } else {
        if (suggestionsContainer) {
            suggestionsContainer.remove();
        }
    }
}

function getKanjiSuggestions(input, charset) {
    const suggestions = [];
    if (input.length === 0 || !charset) {
        return suggestions;
    }

    const lowerCaseInput = input.toLowerCase();

    for (const char in charset) {
        const reading = charset[char];
        let romaji = '';

        if (typeof reading === 'object' && reading.romaji) {
            // For numbers like { latin: '1', romaji: 'ichi' }
            romaji = reading.romaji;
        } else {
            // For simple key-value pairs like { 'あ': 'a' }
            romaji = reading;
        }

        if (romaji && romaji.startsWith(lowerCaseInput)) {
            suggestions.push(char);
        }
    }

    // Add dakuten and handakuten suggestions
    if (lowerCaseInput.length > 0) {
        const lastChar = lowerCaseInput.slice(-1);
        const base = lowerCaseInput.slice(0, -1);

        const dakutenMap = {
            'k': 'g', 's': 'z', 't': 'd', 'h': 'b'
        };
        const handakutenMap = {
            'h': 'p'
        };

        if (dakutenMap[lastChar]) {
            const dakutenReading = base + dakutenMap[lastChar];
            for (const char in charset) {
                const reading = charset[char];
                if (reading === dakutenReading) {
                    suggestions.push(char);
                }
            }
        }

        if (handakutenMap[lastChar]) {
            const handakutenReading = base + handakutenMap[lastChar];
            for (const char in charset) {
                const reading = charset[char];
                if (reading === handakutenReading) {
                    suggestions.push(char);
                }
            }
        }
    }

    return [...new Set(suggestions)];
}