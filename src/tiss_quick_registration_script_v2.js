// ==UserScript==
// @name         TISS Quick Registration Script V2
// @version      2.4.2
// @description  Script to help you to get into the group you want. Opens automatically the right panel, registers automatically and confirms your registration automatically. If you don't want the script to do everything automatically, the focus is already set on the right button, so you only need to confirm. There is also an option available to auto refresh the page, if the registration button is not available yet, so you can open the site and watch the script doing its work. You can also set a specific time when the script should reload the page and start.
// @copyright    2024 Jakob Kinne, MIT License
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @match        https://tiss.tuwien.ac.at/education/course/courseRegistration.xhtml*
// @match        https://tiss.tuwien.ac.at/education/course/register.xhtml*
// @match        https://tiss.tuwien.ac.at/education/course/groupList.xhtml*
// @match        https://tiss.tuwien.ac.at/education/course/examDateList.xhtml*
// ==/UserScript==

let tqrOption = {
    type: {
        LVA: "lva",
        GROUP: "group",
        EXAM: "exam",
        NONE: "none"
    },
    excludedOptions: ["lvaNumber", "registrationType", "started"],
    localStorageKey: "TQRSavedOptions"
};

let strings = {
    ids: {
        tqr: {
            countdown: "#tqr-countdown",
            logWindow: "#tqr-log-window",
            confForm: "#tqr-conf-form",
            selectOption: "#tqr-select-option",
            buttonSave: "#tqr-button-save",
            buttonDelete: "#tqr-button-delete",
            buttonStart: "#tqr-button-start",
        },
        tiss: {
            content: "#contentInner",
            header: "#headerInner",
            subHeader: "#subHeader",
        }
    },
    classes: {
        tqr: {
            log: ".tqr-log",
            inputConf: ".tqr-input-conf-field",
        }
    },
    attributes: {
        tqr: {
            optionName: "aria-option-name",
        }
    }
}

let localisations = {
    "en": {
        lvaRegistration: "Course registration",
        groups: "Groups",
        exams: "Exams",
    },
    "de": {
        lvaRegistration: "LVA-Anmeldung",
        groups: "Gruppen",
        exams: "Prüfungen",
    }
};
// TODO: Language switch
if (localisations[navigator.language.substring(0, 2)] === undefined) {
    localisations = localisations["de"];
}
else {
    localisations = localisations["de"];
}



class TQROption {
    constructor () {
        this.options = {
            scriptEnabled: true,
            lvaCheckEnabled: true,
            lvaSemesterCheckEnabled: true,
            openPanel: true,
            autoRegister: true,
            autoConfirm: true,
            autoRefresh: true,
            autoOkPressAtEnd: true,
            startAtSpecificTime: true,
            okPressAtEndDelayInMs: 1000,
            delayAdjustmentInMs: 300,
            specificStartTime: TQROption.getDate(2024, 9, 9, 0, 0),
            lvaSemester: TQROption.getCurrentOrNextSemester(),
            
            registrationType: tqrOption.type.NONE,
            started: false,
            lvaNumber: "",
        }
    }

    static convertToJson(object) {
        return JSON.stringify(object);
    }

    static convertToObject(json) {
        return JSON.parse(json);
    }

    static getLocalStorageObject() {
        let json = localStorage.getItem(tqrOption.localStorageKey);
        let object = TQROption.convertToObject(json);
        return (object === null) ? {} : object;
    }

    static getLocalStorageKeys() {
        return Object.keys(TQROption.getLocalStorageObject());
    }

    static loadObject(lvaNumber, registrationType) {
        let object = TQROption.getLocalStorageObject();
        return object[lvaNumber + "/" + registrationType];
    }

    static loadTQROption(lvaNumber, registrationType) {
        let object = TQROption.loadObject(lvaNumber, registrationType);

        if (object === undefined) {
            TissQuickRegistration.log("No existing settings found!");
            TissQuickRegistration.log("Creating default options ...");
        }

        if (registrationType == tqrOption.type.LVA) {
            if (object === undefined) return new TQRLvaOption().lvaNumber(lvaNumber);
            return new TQRLvaOption().setOptions(object);
        }
        else if (registrationType == tqrOption.type.GROUP) {
            if (object === undefined) return new TQRGroupOption().lvaNumber(lvaNumber);
            return new TQRGroupOption().setOptions(object);
        }
        else if (registrationType == tqrOption.type.EXAM) {
            if (object === undefined) return new TQRExamOption().lvaNumber(lvaNumber);
            return new TQRExamOption().setOptions(object);
        }

        throw new Error("Registration type not valid");
    }

    getKey() {
        return this.options.lvaNumber + "/" + this.options.registrationType;
    }

    save() {
        let object = TQROption.getLocalStorageObject();
        object[this.getKey()] = this.options;
        localStorage.setItem(tqrOption.localStorageKey, TQROption.convertToJson(object));
    }

    remove() {
        let object = TQROption.getLocalStorageObject();
        delete object[this.getKey()]
        localStorage.setItem(tqrOption.localStorageKey, TQROption.convertToJson(object));
    }

    setOptions(newOptions) {
        for (const [key, value] of Object.entries(newOptions)) {
            this.options[key] = value;
        }

        if (typeof this.options.specificStartTime === "string") {
            this.options.specificStartTime = new Date(this.options.specificStartTime);
        }

        return this;
    }

    initBuildFunctions() {
        for (const [key, value] of Object.entries(this.options)) {
            this[key] = function (value) {
                this.options[key] = value;
                return this;
            }
        }
    }

    static getCurrentOrNextSemester() {
        let now = new Date();
    
        let currentMonth = now.getMonth();

        if (currentMonth > 5 || currentMonth < 2)
        {
            return now.getFullYear() + "W";
        }

        return now.getFullYear() + "S";
    }

    static getDate(year, month, day, hour, minute) {
        return new Date(year, month - 1, day, hour, minute, 0, 0);
    }
}

class TQRLvaOption extends TQROption {
    constructor () {
        super();

        this.options.nameOfGroup = localisations.lvaRegistration;
        this.options.registrationType = tqrOption.type.LVA;

        this.initBuildFunctions();
    }
}

class TQRGroupOption extends TQROption {
    constructor () {
        super();

        this.options.nameOfGroup = "";
        this.options.registrationType = tqrOption.type.GROUP;

        this.initBuildFunctions();
    }
}

class TQRExamOption extends TQROption {
    constructor () {
        super();

        this.options.nameOfExam = "";
        this.options.dateOfExam = new Date();
        this.options.registrationType = tqrOption.type.EXAM;

        this.initBuildFunctions();
    }

    setOptions(newOptions) {
        super.setOptions(newOptions);
        
        if (typeof newOptions.dateOfExam === "string") {
            newOptions.dateOfExam = new Date(newOptions.dateOfExam);
        }

        return this;
    }
}




class TissQuickRegistration {
    constructor () {
        TissQuickRegistration.extendJQuery();
        TissQuickRegistration.injectCoreComponents();

        TissQuickRegistration.log("Welcome to TQRv2 by JK");
        TissQuickRegistration.log("LVA-Number: " + TissQuickRegistration.getLVANumber());
        TissQuickRegistration.log("RegistrationType: " + TissQuickRegistration.getRegistrationType());
        TissQuickRegistration.log("Semester: " + TissQuickRegistration.getSemester());

        TissQuickRegistration.options = null;
        TissQuickRegistration.injectOptions();
        TissQuickRegistration.hookControlEvents();
    }

    static extendJQuery() {
        jQuery.fn.justtext = function () {
            return $(this).clone()
                .children()
                .remove()
                .end()
                .text().trim();
        };
    }

    tissQuickRegistration() {}

    ////////////////////////////////////////
    //  Getters
    //

    static getLVANumber() {
        return $(strings.ids.tiss.content).find('h1 span:first').text().trim();
    }

    static getLVAName() {
        return $(strings.ids.tiss.content).find('h1').justtext();
    }

    static getRegistrationType() {
        let semesterTab = TissQuickRegistration.getSemesterTab();

        if (semesterTab == localisations.lvaRegistration) {
            return tqrOption.type.LVA;
        }
        else if (semesterTab == localisations.groups) {
            return tqrOption.type.GROUP;
        }
        else if (semesterTab == localisations.exams) {
            return tqrOption.type.EXAM;
        }

        return tqrOption.type.NONE;
    }

    static getSemester() {
        return $(strings.ids.tiss.content).find('h1 select').val();
    }

    static getSemesterTab() {
        return $('li.ui-tabs-selected').text().trim();
    }

    static getSubHeader() {
        return $(strings.ids.tiss.content)
            .find(strings.ids.tiss.subHeader)
            .text().trim();
    }

    static getCountdownField() {
        return $(strings.ids.tqr.countdown);
    }

    static getLogField() {
        return $(strings.ids.tqr.logWindow);
    }

    static getOptionSelect() {
        return $(strings.ids.tqr.selectOption);
    }

    static getButtonSave() {
        return $(strings.ids.tqr.buttonSave);
    }

    static getButtonDelete() {
        return $(strings.ids.tqr.buttonDelete);
    }

    static getButtonStart() {
        return $(strings.ids.tqr.buttonStart);
    }

    static getConfigurationSection() {
        return $(strings.ids.tqr.confForm);
    }

    static getConfigurationInputFields() {
        return $(strings.classes.tqr.inputConf);
    }

    static getDataFromConfigurationSection() {
        let data = {};

        TissQuickRegistration.getConfigurationInputFields().each(function () {
            if (this.getAttribute("type") == "checkbox") {
                data[this.getAttribute(strings.attributes.tqr.optionName)] = this.checked;
            }
            else {
                data[this.getAttribute(strings.attributes.tqr.optionName)] = this.value;
            }
        });

        return data;
    }

    static getRegistrationButton() {}

    static getConfirmButton() {}

    static getOkButton() {}

    static getStudyCodeSelect() {}

    static getGroupLabel() {}

    static getExamLabel() {}

    static getExamDate() {}

    static getDateFormat(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    //
    //  End of Getters
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  On Page
    //

    onLVAPage() {}

    onGroupPage() {}

    onExamPage() {}

    onStudyCodeSelectPage() {}

    onConfirmPage() {}

    onConfirmInfoPage() {}

    //
    //  End of on Page
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  Checks
    //

    doGroupCheck() {}

    doLVACheck() {}

    doSemesterCheck() {}

    doExamCheck() {}

    isCorrectSemester() {}

    //
    //  End of Checks
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  Injections
    //

    static injectCoreComponents() {
        TissQuickRegistration.injectInterface();
        TissQuickRegistration.injectCustomCss();
    }

    static injectCustomCss() {
        $("body").prepend("<style>"+
`
:root{--tqr-primary-color:#002d45d2}#tqr-menu{background-color:var(--tqr-primary-color);width:300px;height:500px;position:absolute;border-radius:5px;font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:15px;overflow-y:hidden;transition:height 250ms ease-in-out;z-index:1000;margin-top:20px;margin-left:20px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}#tqr-menu.collapsed{height:38px}#tqr-menu.collapsed:has(#tqr-countdown){height:76px}#tqr-menu button{background-color:#f2c998;border:1px solid #c48941;color:#804600;-moz-text-shadow:0 1px 0 #fff;-webkit-text-shadow:0 1px 0 #fff;text-shadow:0 1px 0 #fff}#tqr-menu button:focus{-webkit-box-shadow:0 0 5px 2px #f2c998;box-shadow:0 0 5px 2px #f2c998;outline:0}#tqr-menu input{border:1px solid #c48941!important;color:#804600;-moz-text-shadow:0 1px 0 #fff;-webkit-text-shadow:0 1px 0 #fff;text-shadow:0 1px 0 #fff}#tqr-menu input:focus{border:1px solid #c48941!important;-webkit-box-shadow:0 0 5px 2px #f2c998!important;box-shadow:0 0 5px 2px #f2c998!important;outline:0!important}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:0 0}::-webkit-scrollbar-thumb{background:#f2c998;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#f2c998}.tqr-header{width:100%;height:38px;display:flex;justify-content:center;align-items:center;border-radius:5px 5px 0 0;background-color:var(--tqr-primary-color);display:flex;cursor:pointer;position:relative;top:0;z-index:1002}.tqr-footer{width:100%;height:38px;display:flex;justify-content:center;align-items:center;border-radius:0 0 5px 5px;background-color:var(--tqr-primary-color);display:flex;position:absolute;bottom:0;z-index:1001}.tqr-body{width:calc(100% - 30px);height:calc(100% - 96px);padding:10px 15px;overflow-y:scroll}.collapsed>.tqr-body{display:none}.tqr-headline{font-weight:700;font-size:20px}.tqr-subheadline{font-weight:700;font-size:18px}.tqr-content+.tqr-content{margin-top:20px}.tqr-content>:nth-child(2){margin-top:5px}#tqr-log-window{width:100%;height:100px;display:flex;flex-direction:column;background-color:var(--tqr-primary-color);border-radius:5px;padding:1.25px 4px;overflow-y:scroll}.tqr-log-error{color:#df0000}.tqr-log-success{color:#00c900}#tqr-conf-form>input:not([type=checkbox]){width:100%;text-align:center}.tqr-small-spacer{width:100%;height:5px}
`
            +"</style>");
    }

    static injectInterface() {
        $(strings.ids.tiss.header).prepend(
`
<div id="tqr-menu" class="collapsed"><div class="tqr-header" onclick="document.getElementById(&#34;tqr-menu&#34;).classList.toggle(&#34;collapsed&#34;)"><span class="tqr-headline">Easy Auto Registration</span></div><div class="tqr-body"><div class="tqr-content"><span class="tqr-subheadline">Log</span><div id="tqr-log-window"></div></div><div class="tqr-content"><span class="tqr-subheadline">Controls</span><div class="tqr-controls"><select name="tqr-select-option" id="tqr-select-option"></select> <button id="tqr-button-save">Save</button> <button id="tqr-button-delete">Delete</button> <button id="tqr-button-start">Start</button></div></div><div class="tqr-content" id="tqr-conf-form"><span class="tqr-subheadline">Configurations</span></div></div><div class="tqr-footer"></div></div>
`
        )
    }

    static injectOptions(optionsToInject) {
        if (optionsToInject === undefined) {
            optionsToInject = TQROption.loadTQROption(TissQuickRegistration.getLVANumber(), TissQuickRegistration.getRegistrationType());
        }
        else if (typeof optionsToInject === "string") {
            optionsToInject = optionsToInject.split("/");
            optionsToInject = TQROption.loadTQROption(optionsToInject[0], optionsToInject[1]);
        }

        let section = TissQuickRegistration.getConfigurationSection();
        section.empty();

        section.append('<span class="tqr-subheadline">Configurations</span>')
        section.append('<div class="tqr-small-spacer"></div>');

        for (const [key, value] of Object.entries(optionsToInject.options)) {
            if (tqrOption.excludedOptions.includes(key)) {
                continue;
            }

            let id = key;

            if (typeof value === "boolean") {
                section.append(TissQuickRegistration.createInput(id, "checkbox", value));
                section.append(TissQuickRegistration.createLabel(id, key));
            }

            else if (typeof value === "string") {
                section.append(TissQuickRegistration.createLabel(id, key));
                section.append(TissQuickRegistration.createInput(id, "text", value));
            }

            else if (typeof value === "number") {
                section.append(TissQuickRegistration.createLabel(id, key));
                section.append(TissQuickRegistration.createInput(id, "number", value));
            }

            else if (value.constructor.name === "Date") {
                section.append(TissQuickRegistration.createLabel(id, key));
                section.append(TissQuickRegistration.createInput(id, "datetime-local", value));
            }

            else {
                section.append(TissQuickRegistration.createLabel(id, key));
            }

            section.append('<div class="tqr-small-spacer"></div>');
        }

        TissQuickRegistration.options = optionsToInject;
        TissQuickRegistration.updateOptionDropdown(optionsToInject.getKey());
    }

    static injectCountdownIntoFooter() {
        
    }

    static hookControlEvents() {
        TissQuickRegistration.getButtonSave().on("click", function () {
            TissQuickRegistration.options.setOptions(TissQuickRegistration.getDataFromConfigurationSection()).save();
            TissQuickRegistration.updateOptionDropdown(TissQuickRegistration.options.getKey());
            TissQuickRegistration.log("Saved options to storage");
        });

        TissQuickRegistration.getButtonDelete().on("click", function () {
            TissQuickRegistration.options.remove();
            TissQuickRegistration.updateOptionDropdown();
            TissQuickRegistration.log("Deleted options from storage");
        });

        TissQuickRegistration.getButtonStart().on("click", function () {
            let selectedKey = TissQuickRegistration.getLVANumber() + "/" + TissQuickRegistration.getRegistrationType();

            if (TissQuickRegistration.options.getKey() != selectedKey) {
                TissQuickRegistration.error("Cannot started with these options!");
                return;
            }

            TissQuickRegistration.options.started(true);
            TissQuickRegistration.getButtonSave().click();

            TissQuickRegistration.success("Script started!");
        });

        TissQuickRegistration.getOptionSelect().on("input", function (event) {
            TissQuickRegistration.log("Loading " + event.target.value);
            TissQuickRegistration.injectOptions(event.target.value);
        });
    }

    //
    //  End of Injections
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  Tools
    //

    static updateOptionDropdown(selectedKey) {
        let select = TissQuickRegistration.getOptionSelect();
        
        select.empty();
        let keyExists = false;

        for (const key of TQROption.getLocalStorageKeys()) {
            if (key == selectedKey) {
                keyExists = true;
            }
            select.append(TissQuickRegistration.createOption(key, key));
        }

        if (!keyExists) {
            select.append(TissQuickRegistration.createOption("", "Create new"));
            selectedKey = "";
        }

        select.val(selectedKey).change(); // Because it is a jQuery-Object
    }

    static createLabel(forElementId, content) {
        let label = document.createElement("label");
        label.setAttribute("for", "tqr-" + forElementId);
        label.innerHTML = content;
        return label;
    }

    static createInput(name, type, value) {
        let input = document.createElement("input");
        input.setAttribute("type", type);
        input.setAttribute("id", "tqr-" + name);
        input.setAttribute(strings.attributes.tqr.optionName, name);
        input.setAttribute("value", (type == "datetime-local") ? TissQuickRegistration.getDateFormat(value) : value);

        input.classList.add(strings.classes.tqr.inputConf.substring(1));

        if (type == "checkbox" && value) {
            input.setAttribute("checked", "checked");
        }

        return input;
    }

    static createOption(value, text) {
        let option = document.createElement("option");
        option.setAttribute("value", value);
        option.innerHTML = text;
        return option;
    }

    pageCountdown() {}

    highlight(object) {
        object.css("background-color", "lightgreen");
    }

    setSelectValue() {}

    static error(text) {
        TissQuickRegistration.log(text, "error");
    }

    static success(text) {
        TissQuickRegistration.log(text, "success");
    }

    static log(text, type) {
        let logField = TissQuickRegistration.getLogField();

        let entry = document.createElement("span");
        entry.classList.add(strings.classes.tqr.log.substring(1) + ((type != undefined) ? ("-" + type) : ""));
        entry.innerHTML = text;

        logField.append(entry);

        logField.scrollTop(logField.prop("scrollHeight"));
        
    }

    //
    //  End of Tools
    ////////////////////////////////////////////
};

new TissQuickRegistration();
