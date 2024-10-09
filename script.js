//#region ELEMENTSID
const userParameters = document.getElementById("userPrimarySection");
const divTypeButton = document.getElementById('divTypeOption');
const daContent = document.getElementById('dropAreaContent');
const checkToAuto = document.getElementById('checkToAuto');
const pagesPerDiv = document.getElementById('pagesPerDiv');
const checkToZip = document.getElementById('checkToZip');
const structure = document.getElementById('structure');
const pagenumber = document.getElementById('numPages');
const paramsDiv = document.getElementById('paramsDiv');
const dropArea = document.getElementById('dropArea');
const pagesPer = document.getElementById('pagesPer');
const autitex = document.getElementById('autotext');
const pdfName = document.getElementById('pdfName');
const process = document.getElementById('process');
const minus = document.getElementById('minus');
const plus = document.getElementById('plus');
const auti = document.getElementById('auto');

divTypeButton.addEventListener('click', toggleType);
checkToAuto.addEventListener('click', toggleUseAuto);
checkToZip.addEventListener('click', toggleUseZip);
process.addEventListener('click', onProcessClick);
//#endregion

let rawFile, file, fileLoaded = false; //filedatas
let PDFok = false, pageCount = 4, pagesPerSec = 4, useZip = false, useAuto = false, typePages = true, pagesPerValue = 0; //signaturizer variables
const zip = new JSZip(); 
let sets = [{groups: 0, pages: 0}, {groups: 0, pages: 0}];
let _sets = [{groups: 0, pages: 0}, {groups: 0, pages: 0}];
let tmp_sets = [{groups: 0, pages: 0}, {groups: 0, pages: 0}];

const reader = new FileReader(); 
reader.onload = (async (e) => {
    file = await PDFLib.PDFDocument.load(e.target.result);
    //after file mounted
    pageCount = file.getPageCount();
    const maxDivs = Math.floor(pageCount / 4) * 4;
    pagenumber.innerText = `${pageCount} pp.`;
    pagesPer.setAttribute('max', maxDivs);
    handleNumberChange();
    if (pageCount < 16) {
        handleError("Please use a file bigger than 16 pages.", "Error with PDF");
    }
});

setDACotent('default');
setParamsDivEnabled(false);

function handleError(caption, head) {
    alert(`${head}\r\n${caption}`);
    PDFok = false;
    setParamsDivEnabled(false);
    fileLoaded = false;
}

//#region TOGGLES
function toggleUseZip() {
    useZip = !useZip; 
    const checkmarkDiv = checkToZip.querySelector('.checkmark');
    if (useZip) { checkToZip.classList.add('checked'); checkmarkDiv.textContent = '✓'; } 
    else { checkToZip.classList.remove('checked');  checkmarkDiv.textContent = '✗'; }
}

function toggleUseAuto() {
    useAuto = !useAuto; 
    const checkmarkDiv = checkToAuto.querySelector('.checkmark');
    if (useAuto) { 
        checkToAuto.classList.add('checked'); 
        checkmarkDiv.textContent = '✓'; 
        userParameters.style.visibility = "hidden"; 
        structure.style.visibility = "hidden";
        auti.style.visibility = "visible";
        autitex.style.visibility = "visible";
        autitex.innerText = "Don't worry!\r I will chose the best option!";
    } else { 
        checkToAuto.classList.remove('checked');  
        checkmarkDiv.textContent = '✗'; 
        userParameters.style.visibility = "visible"; 
        structure.style.visibility = "visible";
        auti.style.visibility = "hidden";
        autitex.style.visibility = "hidden";
    }
    
}

function toggleType() {
    typePages = !typePages;
    divTypeButton.textContent = (typePages) ? 'Pages' : 'Leafs'; 
    pagesPer.value = (typePages) ? pagesPer.value * 4 : pagesPer.value / 4;
    pagesPer.setAttribute('max', (typePages) ? Math.floor(pageCount / 4) * 4 : Math.floor(pageCount / 4) );
    pagesPer.setAttribute('min', (typePages) ? 4 : 1 );
}
//#endregion

//#region DROPAREA
dropArea.addEventListener('dragover', preventDefaults);
dropArea.addEventListener('dragenter', preventDefaults);
dropArea.addEventListener('dragleave', preventDefaults);
dropArea.addEventListener('dragover', () => { dropArea.classList.add('dragOver'); setDACotent('dragover'); });
dropArea.addEventListener('dragleave', () => { dropArea.classList.remove('dragOver'); setDACotent('default'); });
dropArea.addEventListener('drop', handleDrop);
dropArea.addEventListener('click', handleClick);
dropArea.addEventListener('mouseover', () => setDACotent('mouseover'));
dropArea.addEventListener('mouseout', () => setDACotent('default'));
dropArea.addEventListener('mouseleave', () => setDACotent('default'));

function handleClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.addEventListener('change', (e) => handleInput(e.target.files[0]));
    input.click();
}

function handleDrop(e) {
    e.preventDefault();
    dropArea.classList.remove('dragOver');
    handleInput(e.dataTransfer.files[0]);
}

function handleInput(_file) {
    if (_file.size < 75_000_000) {
        rawFile = _file;
        onPDFChange();
    } else {
        handleError("Try a smaller file (<75MiB)", "File too heavy!");
    }
}

//#endregion

//#region PDF Process
function onPDFChange() {
    if (rawFile && rawFile.type !== 'application/pdf') {
      handleError("Please upload a PDF file.", "Error with file");
    } else if (rawFile == undefined) {
        handleError("Please select a PDF file.", "Error with file");
    } else {
        PDFok = true;
        reader.readAsArrayBuffer(rawFile);
        setParamsDivEnabled(true);
        dropArea.classList.remove('empty');
    }
}

async function onProcessClick() {
    if (useAuto) { autoSetPages(); }
    if (PDFok) {
        if (useZip) { processZIPFile(); } 
        else { processOneFile(); }
    }
}

function autoSetPages() {
    let nGroups, nPages, searching;
    let groups = Math.floor(pageCount/4)*4, pages;
    const sig = [24, 28, 20, 16, 32, 36];

    searching = sig.every((s) => {
        if (groups * s >= pageCount - 3 && groups * s <= pageCount + 3) {
            nGroups = groups;
            nPages = s;
            return false;
        }
        return true;
    });
    if (searching) {
        nGroups = Math.floor(pageCount/24);
        nPages = 24;
    }

    distribute(true, nGroups, nPages);
}

async function processOneFile() {
    const newPdfDoc = await PDFLib.PDFDocument.create();
    
    const arrayOfPages = Array.from({length: pageCount}, (_, i) => i);
    const copiedPages = await newPdfDoc.copyPages(file, arrayOfPages);
    
    const groups0 = (sets[0].whites > 0) ? sets[0].groups - 1 : sets[0].groups;
    for (let i = 0; i < groups0; i++) {
        const start = i * sets[0].pages;
        for (let j = 0; j < (sets[0].pages / 2); j += 2) {
            newPdfDoc.addPage(copiedPages[start + sets[0].pages - 1 - j]);
            newPdfDoc.addPage(copiedPages[start + j]);
            newPdfDoc.addPage(copiedPages[start + j + 1]);
            newPdfDoc.addPage(copiedPages[start + sets[0].pages - 2 - j]);
        }
    }

    const startSet1 = sets[0].groups * sets[0].pages;

    const groups1 = (sets[1].whites > 0) ? sets[1].groups - 1 : sets[1].groups;
    for (let i = 0; i < groups1; i++) {
        const start = i * sets[1].pages + startSet1;
        for (let j = 0; j < (sets[0].pages / 2); j += 2) {
            newPdfDoc.addPage(copiedPages[start + sets[1].pages - 1 - j]);
            newPdfDoc.addPage(copiedPages[start + j]);
            newPdfDoc.addPage(copiedPages[start + j + 1]);
            newPdfDoc.addPage(copiedPages[start + sets[1].pages - 2 - j]);
        }
    }

    const newFile = await newPdfDoc.save();    
    download(new Blob([newFile]), 'file.pdf');
}

async function processZIPFile() {
    let newFilesDict = {};

    for (let i = 0; i < sets[0].groups; i++) {
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const start = i * sets[0].pages;
        const arrayOfPages = Array.from({length: sets[0].pages}, (_, i) => i + start)
            .filter(pageIndex => pageIndex < pageCount);
        const copiedPages = await newPdfDoc.copyPages(file, arrayOfPages);

        for (let j = 0; j < (sets[0].pages / 2); j += 2) {
            newPdfDoc.addPage(copiedPages[sets[0].pages - 1 - j]);
            newPdfDoc.addPage(copiedPages[j]);
            newPdfDoc.addPage(copiedPages[j + 1]);
            newPdfDoc.addPage(copiedPages[sets[0].pages - 2 - j]);
        }

        newFilesDict[`part${i + 1}.pdf`] = await newPdfDoc.save();
    }

    const startSet1 = sets[0].groups * sets[0].pages;

    for (let i = 0; i < sets[1].groups; i++) {
        const newPdfDoc = await PDFLib.PDFDocument.create();
        const start = i * sets[1].pages + startSet1;
        const arrayOfPages = Array.from({length: sets[1].pages}, (_, i) => i + start)
            .filter(pageIndex => pageIndex < pageCount);
        const copiedPages = await newPdfDoc.copyPages(file, arrayOfPages);
        
        for (let j = 0; j < (sets[1].pages / 2); j += 2) {
            newPdfDoc.addPage(copiedPages[sets[1].pages - 1 - j]);
            newPdfDoc.addPage(copiedPages[j]);
            newPdfDoc.addPage(copiedPages[j + 1]);
            newPdfDoc.addPage(copiedPages[sets[1].pages - 2 - j]);
        }

        newFilesDict[`part${i + sets[0].groups + 1}.pdf`] = await newPdfDoc.save();
    }

    bundleZIP(newFilesDict);
}

async function bundleZIP(dictionary) {
    for (const fileName of Object.keys(dictionary)) {
        zip.file(fileName, dictionary[fileName]);
    }

    process.innerText = "Processing...";

    zip.generateAsync({type: "blob"}).then((content) => {
        process.innerText = "Done!";
        download(content, `${pdfName.value}.zip`);
    });
}

function download(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
}

//#endregion

//#region MISCELANIOUS
function setDACotent(type = null) {
    if (!fileLoaded) {
        switch (type) {
            case 'default':
                daContent.childNodes[2].textContent = "Drop PDF or Click to select";
                daContent.childNodes[1].setAttribute('src', 'svgs/drop.svg');
                break;
            case 'dragover':
                daContent.childNodes[2].textContent = "Drop to load!!!";
                daContent.childNodes[1].setAttribute('src', 'svgs/dragged.svg');
                break;
            case 'mouseover':
                daContent.childNodes[2].textContent = "Upload from computer";
                daContent.childNodes[1].setAttribute('src', 'svgs/upload.svg');
                break;
        }
    } else {
        daContent.childNodes[2].textContent = "File loaded";
        daContent.childNodes[1].setAttribute('src', 'svgs/loaded.svg');
    }
};

function setParamsDivEnabled(v) {
    if (!v) { paramsDiv.style.display = 'none'; return; } 
    
    paramsDiv.style.display = 'grid';

    fileLoaded = true;
    setDACotent();
    pdfName.value = rawFile.name.substring(0, rawFile.name.length - 4);
    document.getElementById('pdfSize').innerText = formatByte(rawFile.size);
    pagenumber.innerText = "Counting page number...";
    pagesPer.value = 4;
}

function formatByte(bytes) {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
//#endregion

//#region PagesPerSignature
let isMouseDownPlus = false, isMouseDownMinus = false;
let intervalPlus, intervalMinus;
let clickTimeoutPlus, clickTimeoutMinus;

plus.addEventListener('mousedown', handleMouseDownPlus);
plus.addEventListener('mouseup', handleMouseUpPlus);
plus.addEventListener('mouseleave', stopPlus); // Stop when mouse leaves the button
minus.addEventListener('mousedown', handleMouseDownMinus);
minus.addEventListener('mouseup', handleMouseUpMinus);
minus.addEventListener('mouseleave', stopMinus); // Stop when mouse leaves the button
pagesPer.addEventListener('change', handleNumberInput);
pagesPer.addEventListener('wheel', handleWheel);

function handleNumberInput() {
    if (pagesPer.value == '' || pagesPer.value == 0) { pagesPer.value = 1; }
    if (pagesPer.value > pageCount) { pagesPer.value = pageCount; }
    if (pagesPer.value % 4 != 0) { pagesPer.value = Math.floor(pagesPer.value / 4) * 4 }
    handleNumberChange();
}   

function handleWheel(e) {
    e.preventDefault();
    byX(e.deltaY < 0);
}

function handleMouseDownPlus() {
    isMouseDownPlus = true;
    byX(true);
    handleNumberChange();

    clickTimeoutPlus = setTimeout(() => {
        if (isMouseDownPlus) {
            intervalPlus = setInterval(() => {
                byX(true);
                handleNumberChange();
            }, 100);
        }
    }, 200); 
}

function handleMouseUpPlus() {
    isMouseDownPlus = false;
    clearTimeout(clickTimeoutPlus);
    stopPlus();
}

function handleMouseDownMinus() {
    isMouseDownMinus = true;
    byX(false);
    handleNumberChange();

    clickTimeoutMinus = setTimeout(() => {
        if (isMouseDownMinus) {
            intervalMinus = setInterval(() => {
                byX(false);
                handleNumberChange();
            }, 100);
        }
    }, 200);
}

function handleMouseUpMinus() {
    isMouseDownMinus = false;
    clearTimeout(clickTimeoutMinus); 
    stopMinus();
}

function stopPlus() {
    clearInterval(intervalPlus);
    intervalPlus = null;
}

function stopMinus() {
    clearInterval(intervalMinus);
    intervalMinus = null;
}

function byX(plus) {
    const top = (typePages) ? 4 : 1;
    if (plus) { for (let i = 0; i < top; i++) { pagesPer.stepUp(); } } 
    else { for (let i = 0; i < top; i++) { pagesPer.stepDown(); } }
}

let toDistributeFull, recomended, optional, buttonChecked;

function handleNumberChange() {
    pagesPerValue = +pagesPer.value;
    distribute();

    recomended = `${sets[0].groups} groups of ${sets[0].pages}${
            (sets[1].groups <= 0) ? '.' :  ` and ${sets[1].groups} ${sets[1].groups > 1 ? 'groups' : 'group'} of ${sets[1].pages}.`
        }`;

    if (sets[0].pages > pagesPerValue && sets[1].groups > 0 && sets[1].pages == sets[0].pages + 4) {
        structure.style.display = 'grid';
        structure.textContent = "";

        let pages = Math.ceil(pageCount / 4) * 4;
        _sets[0].groups = Math.floor(pages / pagesPerValue);
        _sets[0].pages = pagesPerValue;
        _sets[1].groups = 1;
        _sets[1].pages = pages - (_sets[0].groups * pagesPerValue);

        optional = `${_sets[0].groups} groups of ${_sets[0].pages} and a group of ${_sets[1].pages}.`

        structure.appendChild(getInput(1, true));
        structure.appendChild(getInput(2, false));
        structure.appendChild(getDiv(1, recomended));
        structure.appendChild(getDiv(2, optional));

        tmp_sets = sets.map(obj => ({ ...obj }));
        buttonChecked = 2;
        handleRadClick(1);

    } else {
        structure.style.display = 'block';
        structure.textContent = recomended;
    }

    function getInput(n, checked) {
        const rad = document.createElement('input');
        rad.id = `rad${n}`;
        rad.checked = checked;
        rad.setAttribute('type', 'radio');
        rad.setAttribute('name', 'radiog');
        rad.style.gridRow = n;
        rad.addEventListener('click', () => handleRadClick(n));
        return rad;
    }

    function getDiv(n, text) {
        const div = document.createElement('div');
        div.id = `div${n}`;
        div.textContent = text;
        div.style.gridRow = n;
        div.addEventListener('click', () => handleRadClick(n));
        return div;
    }

    function handleRadClick(target) {
        if (buttonChecked != target) {
            structure.childNodes.forEach((node) => {
                if (node.nodeName === 'DIV') { node.style.color = '#bbb'; }
            });
            document.getElementById(`div${target}`).style.color = '#fff';
            document.getElementById(`rad${target}`).checked = true;
            buttonChecked = (buttonChecked == 1) ? 2 : 1;
            sets = (buttonChecked == 1) ? tmp_sets.map(obj => ({ ...obj })) : _sets.map(obj => ({ ...obj }));
        }
    }
}

function distribute(forced, _nGroups, _nPages){
    const nPages = (forced) ? _nPages : parseInt(typePages ? pagesPerValue : pagesPerValue * 4);
    const nGroups = (forced) ? _nGroups : Math.floor((pageCount / nPages));
    const residual = pageCount - (nPages * nGroups);
    sets = [{groups: nGroups, pages: nPages}, {groups: 0, pages: 0}];

    if (residual != 0) {
        sets[1].groups = Math.ceil(residual / 4);
        switch (true) {
            case (residual >= sets[0].pages - 4 && residual < sets[0].pages):
                sets[1].groups = 1
                sets[1].pages = residual
                break;
            case (residual <= 4 && residual > 0):
                sets[0].groups -= 1
                sets[1].groups = 1
                sets[1].pages = pagesPerValue + residual
                break;
            case (sets[0].groups > sets[1].groups): 
                sets[0].groups -= sets[1].groups;
                sets[1].pages = sets[0].pages + 4;
                break;
            case (sets[0].groups == sets[1].groups):
                sets[0].pages += 4;
                sets[1].groups = 0;
                break;
            default:
                toDistributeFull = Math.floor(sets[1].groups / sets[0].groups);
                sets[0].pages += toDistributeFull * 4;
                sets[1].pages = sets[0].pages + 4;
                sets[1].groups = Math.ceil(sets[1].groups % sets[0].groups);
                sets[0].groups -= sets[1].groups;
                break;
        }
    }
}
//#endregion
