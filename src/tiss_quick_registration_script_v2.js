// ==UserScript==
// @name         TQR by Jakin
// @version      2.6.10
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
    excludedOptions: ["lvaNumber", "registrationType", "started", "dspwid"],
    localStorageKey: "TQRSavedOptions"
};

let autoConfirmUrls = [
    "https://tiss.tuwien.ac.at/education/course/courseRegistration.xhtml",
    "https://tiss.tuwien.ac.at/education/course/register.xhtml",
    "https://tiss.tuwien.ac.at/education/course/groupList.xhtml",
    "https://tiss.tuwien.ac.at/education/course/examDateList.xhtml"
];

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
            buttonStop: "#tqr-button-stop",
        },
        tiss: {
            content: "#contentInner",
            header: "#headerInner",
            subHeader: "#subHeader",
            languageDe: "#language_de",
            lenguageEn: "#language_en",
        }
    },
    classes: {
        tqr: {
            log: ".tqr-log",
            inputConf: ".tqr-input-conf-field",
            highlight: ".tqr-highlight",
        },
        tiss: {
            groupWrapper: ".groupWrapper",
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

        register: "Register",
        preRegister: "Pre-Register",
        preRegistration: "Pre-Registration",

        deregister: "Deregistration",
    },
    "de": {
        lvaRegistration: "LVA-Anmeldung",
        groups: "Gruppen",
        exams: "Prüfungen",

        register: "Anmelden",
        preRegister: "Voranmelden",
        preRegistration: "Voranmeldung",

        deregister: "Abmelden",
    }
};

if ($(strings.ids.tiss.languageDe).length > 0) {
    localisations = localisations["en"];
}
else {
    localisations = localisations["de"];
}



class TQROption {
    constructor () {
        this.options = {
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
            dspwid: -1,
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
        else if (registrationType == tqrOption.type.NONE) {
            return null;
        }

        throw new Error("Registration type not valid");
    }

    static loadTQROptionFromDspwid(dspwid) {
        let storage = TQROption.getLocalStorageObject();

        for (const obj of Object.values(storage)) {
            if (obj.dspwid == dspwid) {
                return this.loadTQROption(obj.lvaNumber, obj.registrationType);
            }
        }

        return null;
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

    get(name) {
        return this.options[name];
    }

    initBuildFunctions() {
        for (const [key, value] of Object.entries(this.options)) {
            this[key] = function (value) {
                this.options[key] = value;
                return this;
            }

            this[key].data = this;

            this[key].val = function () {
                return this.data.options[key];
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
        
        if (typeof this.options.dateOfExam === "string") {
            this.options.dateOfExam = new Date(this.options.dateOfExam);
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
        TissQuickRegistration.error("Warning current version might not support exams");

        TissQuickRegistration.options = null;

        TissQuickRegistration.injectOptions();
        TissQuickRegistration.manageControlAccess();
        TissQuickRegistration.hookControlEvents();

        if (TissQuickRegistration.isConfirmURL()) {
            TissQuickRegistration.disableAllElements();
        }

        this.run();
    }

    static extendJQuery() {
        jQuery.fn.justtext = function () {
            return $(this).clone()
                .children()
                .remove()
                .end()
                .text().trim();
        };

        jQuery.fn.disable = function () {
            let e = $(this);
            e.attr("disabled", true);
            return e;
        };

        jQuery.fn.enable = function () {
            let e = $(this);
            e.attr("disabled", false);
            return e;
        };
    }

    run() {
        if (!TissQuickRegistration.options.started.val()) return;

        TissQuickRegistration.getButtonStart().click();
    }

    static tissQuickRegistration() {
        let options = TissQuickRegistration.options;

        // test if the lva and group exists
        if (!options.lvaCheckEnabled.val() || TissQuickRegistration.doLvaCheck()) {
            if (!options.lvaSemesterCheckEnabled.val() || TissQuickRegistration.doSemesterCheck()) {
                if (options.registrationType.val() !== tqrOption.type.EXAM) {
                    if (TissQuickRegistration.doGroupCheck()) {
                        let groupLabel = TissQuickRegistration.getGroupLabel();
                        TissQuickRegistration.highlight(groupLabel);
                        if(!TissQuickRegistration.isConfirmURL()) {
                            TissQuickRegistration.log("Group: " + groupLabel.text().trim());
                        }
                    }
                    else {
                        TissQuickRegistration.options.started(false);
                        TissQuickRegistration.getButtonStop().click();
                        return;
                    }
                } else {
                    if (TissQuickRegistration.doExamCheck()) {
                        let examLabel = TissQuickRegistration.getExamLabel();
                        let exam = TissQuickRegistration.getExam();
                        TissQuickRegistration.highlight(exam);
                        if(!TissQuickRegistration.isConfirmURL()) {
                            TissQuickRegistration.log("Exam: " + exam.text().trim());
                        }
                    }
                    else {
                        TissQuickRegistration.options.started(false);
                        TissQuickRegistration.getButtonStop().click();
                        return;
                    }
                }
            }
        }

        if (options.startAtSpecificTime.val()) {
            this.log("Script starts at: " + TissQuickRegistration.getFormatedDate(options.specificStartTime.val()));
            this.log("Delay adjustment in ms: " + options.delayAdjustmentInMs.val());
            TissQuickRegistration.startTimer();
        }
        else {
            TissQuickRegistration.registerAndConfirm();
        }
    }

    static startTimer() {
        let startTime = TissQuickRegistration.options.specificStartTime.val().getTime() - 
            TissQuickRegistration.options.delayAdjustmentInMs.val();
        let offset = startTime - new Date().getTime();
        if (offset > 0) {
            TissQuickRegistration.startRefreshTimer(startTime);
        } else {
            TissQuickRegistration.registerAndConfirm();
        }
    }

    static startRefreshTimer(startTime) {
        TissQuickRegistration.printTimeToStart(startTime);

        let maxMillis = 2147483647;
        let offset = startTime - new Date().getTime();

        if (offset > maxMillis) {
            offset = maxMillis;
        }

        window.setTimeout(TissQuickRegistration.refreshPage, offset);
    }

    static printTimeToStart(startTime) {
        if (!TissQuickRegistration.options.started.val()) {
            TissQuickRegistration.removeCountdownField();
            return;
        }

        let offset = (startTime - new Date().getTime()) / 1000;
        let out = "Refresh in: ";
        let minutes = offset / 60;

        if (minutes > 1) {
            let hours = minutes / 60;
            if (hours > 1) {
                out += Math.floor(hours) + "h, "
                minutes = minutes % 60;
            }
            out += Math.floor(minutes) + "m and ";
        }

        let seconds = offset % 60;
        out += Math.floor(seconds) + "s";

        TissQuickRegistration.pageCountdown(out);

        window.setTimeout(function () {
            TissQuickRegistration.printTimeToStart(startTime);
        }, 1000);
    }

    static registerAndConfirm() {
        let registrationType = TissQuickRegistration.getRegistrationType();
        
        if (registrationType === tqrOption.type.LVA) {
            TissQuickRegistration.onLvaPage();
        }
        else if (registrationType === tqrOption.type.GROUP) {
            TissQuickRegistration.onGroupPage();
        }
        else if (registrationType === tqrOption.type.EXAM) {
            TissQuickRegistration.onExamPage();
        }
        else if (TissQuickRegistration.getStudyCodeSelect().length > 0) {
            TissQuickRegistration.onStudyCodeSelectPage();
        }
        else if (TissQuickRegistration.getConfirmButton().length > 0) {
            TissQuickRegistration.onConfirmPage();
        }
        else if (TissQuickRegistration.getOkButton().length > 0) {
            TissQuickRegistration.onConfirmInfoPage();
        }
    }

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
        let field = $(strings.ids.tqr.countdown);
        if (field.length === 0) {
            TissQuickRegistration.injectCountdownIntoFooter();
            field = TissQuickRegistration.getCountdownField();
        }
        return field;
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

    static getButtonStop() {
        return $(strings.ids.tqr.buttonStop);
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

    static getRegistrationButton(wrapper) {
        let button;
        let registrationType = TissQuickRegistration.options.registrationType.val();

        if (Object.values(tqrOption.type).includes(registrationType)) {
            button = $(wrapper).find("input:submit[value='"+localisations.register+"']");

            if (button.length === 0) {
                button = $(wrapper).find("input:submit[value='"+localisations.preRegister+"']");

                if (button.length === 0) {
                    button = $(wrapper).find("input:submit[value='"+localisations.preRegistration+"']");
                }
            }
        }
        else {
            TissQuickRegistration.error("Registration type is invalid");
        }

        return button;
    }

    static getCancelButton(wrapper) {
        let button = null;
        let registrationType = TissQuickRegistration.options.registrationType.val();

        if (registrationType === tqrOption.type.GROUP || registrationType === tqrOption.type.EXAM) {
            button = $(wrapper).find("input:submit[value='"+localisations.deregister+"']");
        }
        else if (registrationType === tqrOption.type.LVA) {
            button = $(wrapper).find("input:submit[value='"+localisations.deregister+"']")
                .filter(function () {
                    return $(this).attr("id") !== 'registrationForm:confirmOkBtn';
                });
        }
        else {
            TissQuickRegistration.error("Registration type is invalid");
        }

        return button;
    }

    static getConfirmButton() {
        let button = $(wrapper).find("form#regForm input:submit[value='"+localisations.register+"']");

        if (button.length === 0) {
            button = $(wrapper).find("form#regForm input:submit[value='"+localisations.preRegister+"']");

            if (button.length === 0) {
                button = $(wrapper).find("form#regForm input:submit[value='"+localisations.preRegistration+"']");
            }
        }

        return button;
    }

    static getOkButton() {
        return $("form#confirmForm input:submit[value='Ok']");
    }

    static getStudyCodeSelect() {
        return $("#regForm").find("select");
    }

    static getGroupLabel() {
        let groupConfName = TissQuickRegistration.options.nameOfGroup.val()
            .trim().replace(/\s\s+/gi, ' ');

        return $(".groupWrapper .header_element span").filter(function () {
            let name = $(this).text().trim().replace(/\s\s+/gi, ' ');
            return name === groupConfName;
        });
    }

    static getExamLabel() {
        let examConfName = TissQuickRegistration.options.nameOfExam.val();

        return $(".groupWrapper .header_element span").filter(function () {
            let name = $(this).text().trim();
            return name.match(examConfName);
        });
    }

    static getExamDate() {
        return $(".groupWrapper .header_element.titleCol.titleColStudent.groupHeadertrigger").filter(function () {
            let examData = $(this).text().trim();
            let examLabel = TissQuickRegistration.getExamLabel().first().text().trim() + " ";
            let examDate = examData.replace(examLabel, '');
            return examDate.match(TissQuickRegistration.getSimpleFormatedDate(TissQuickRegistration.options.dateOfExam.val()));
        });
    }

    static getExam() {
        return $(".groupWrapper .header_element.titleCol.titleColStudent.groupHeadertrigger").filter(function () {
            let examData = $(this).text().trim();
            return examData.match(TissQuickRegistration.options.nameOfExam.val() + " " + TissQuickRegistration.getSimpleFormatedDate(TissQuickRegistration.options.dateOfExam.val()));
        });
    }

    static getDateFormat(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    static getFormatedDate(date) {
        return date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ":" + date.getMilliseconds();
    }

    static getSimpleFormatedDate(date) {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    }

    static getDspwid() {
        return $("input[name='dspwid']").attr("value");
    }

    static getHighlightedElements() {
        return $(strings.classes.tqr.highlight);
    }

    //
    //  End of Getters
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  On Page
    //

    static onLvaPage() {
        TissQuickRegistration.onRegistrationPage(
            TissQuickRegistration.getGroupLabel()
        );
    }

    static onGroupPage() {
        TissQuickRegistration.onRegistrationPage(
            TissQuickRegistration.getGroupLabel()
        );
    }

    static onExamPage() {
        TissQuickRegistration.onRegistrationPage(
            TissQuickRegistration.getExamLabel()
        );
    }

    static onRegistrationPage(label) {
        if (label === null) {
            return;
        }

        let options = TissQuickRegistration.options;

        if (options.lvaCheckEnabled.val() && !TissQuickRegistration.doLvaCheck()) {
            return;
        }

        if (options.lvaSemesterCheckEnabled.val() && !TissQuickRegistration.doSemesterCheck()) {
            return;
        }

        TissQuickRegistration.highlight(label);

        let wrapper = label.closest(strings.classes.tiss.groupWrapper);

        // open the panel if the option is activated
        if (options.openPanel.val()) {
            wrapper.children().show();

            // for some reason, we have to wait some time here and try it again :/
            setTimeout(function () {
                wrapper.children().show();
            }, 100);
        }

        let registrationButton = TissQuickRegistration.getRegistrationButton(wrapper);
        TissQuickRegistration.log("Registration button found");

        if (registrationButton.length > 0) {
            TissQuickRegistration.highlight(registrationButton);
            registrationButton.focus();

            if (options.autoRegister.val()) {
                registrationButton.click();
            }
        }
        else {
            if (TissQuickRegistration.getCancelButton(wrapper).length > 0) {
                TissQuickRegistration.error("You are registered already");
            }
            else {
                if (options.autoRefresh.val()) {
                    TissQuickRegistration.refreshPage();
                }
                TissQuickRegistration.error("No registration button found");
            }
        }
    }

    static onStudyCodeSelectPage() {
        let studyCodeSelect = TissQuickRegistration.getStudyCodeSelect();
        let confirmButton = TissQuickRegistration.getConfirmButton();

        TissQuickRegistration.highlight(confirmButton);

        if (TissQuickRegistration.options.studyCode.val() !== undefined
            && TissQuickRegistration.options.studyCode.val().length > 0) {
            TissQuickRegistration.setSelectValue(studyCodeSelect, TissQuickRegistration.options.studyCode.val());
        }

        confirmButton.focus();
        if (TissQuickRegistration.options.autoConfirm.val()) {
            confirmButton.click();
        }
    }

    static onConfirmPage() {
        let button = TissQuickRegistration.getConfirmButton();
        TissQuickRegistration.highlight(button);
        button.focus();
        if (TissQuickRegistration.options.autoConfirm.val()) {
            button.click();
        }
    }

    static onConfirmInfoPage() {
        let button = TissQuickRegistration.getOkButton();
        TissQuickRegistration.highlight(button);
        if (TissQuickRegistration.options.autoOkPressAtEnd.val()) {
            setTimeout(function () {
                let button = TissQuickRegistration.getOkButton();
                button.click();
            }, TissQuickRegistration.options.okPressAtEndDelayInMs.val());
        }
    }

    //
    //  End of on Page
    ////////////////////////////////////////////

    ////////////////////////////////////////////
    //  Checks
    //

    static doLvaCheck() {
        let lvaNumber = TissQuickRegistration.getLVANumber();
        let optionsLvaNumber = TissQuickRegistration.options.lvaNumber.val();
        if (lvaNumber !== optionsLvaNumber && !TissQuickRegistration.isConfirmURL()) {
            TissQuickRegistration.error("Wrong lva number, expected '" + lvaNumber + "'");
            return false;
        }
        return true;
    }
    
    static doSemesterCheck() {
        let subheader = TissQuickRegistration.getSubHeader();
        let optionsSemester = TissQuickRegistration.options.lvaSemester.val();
        if (subheader.indexOf(optionsSemester) === -1 && !TissQuickRegistration.isConfirmURL()) {
            TissQuickRegistration.error("Wrong semester, expected '" + optionsSemester + "'");
            return false;
        }
        return true;
    }
    
    static doGroupCheck() {
        let groupLabel = TissQuickRegistration.getGroupLabel();
        if (groupLabel.length === 0 && !TissQuickRegistration.isConfirmURL()) {
            TissQuickRegistration.error("Group '" + TissQuickRegistration.options.nameOfGroup.val() + "' not found");
            return false;
        }
        return true;
    }

    static doExamCheck() {
        let examLabel = TissQuickRegistration.getExamLabel();
        let examDate = TissQuickRegistration.getExamDate();
        let examCombination = TissQuickRegistration.getExam();

        let notOnConfirm = !TissQuickRegistration.isConfirmURL();

        if (examLabel.length === 0 && notOnConfirm) {
            TissQuickRegistration.error("Exam '" + TissQuickRegistration.options.nameOfExam.val() + "' not found");
            return false;
        } else if (examDate.length === 0 && notOnConfirm) {
            TissQuickRegistration.error("No exam on '" + TissQuickRegistration.getSimpleFormatedDate(TissQuickRegistration.options.dateOfExam.val()) + "'");
            return false;
        } else if (examCombination.length === 0 && notOnConfirm) {
            TissQuickRegistration.error(
                "Exam '"+
                TissQuickRegistration.options.nameOfExam.val() +
                "' on '" +
                TissQuickRegistration.getSimpleFormatedDate(TissQuickRegistration.options.dateOfExam.val()) +
                "' not found");
            return false;
        }
        return true;
    }

    static isCorrectSemester() {}

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
:root{--tqr-primary-color:#002d45d2}#tqr-menu{background-color:var(--tqr-primary-color);width:300px;height:500px;position:absolute;border-radius:5px;font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:15px;overflow-y:hidden;transition:height 250ms ease-in-out;z-index:1000;margin-top:20px;margin-left:20px;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}#tqr-menu.collapsed{height:38px}#tqr-menu.collapsed:has(#tqr-countdown){height:76px}#tqr-menu button{background-color:#f2c998;border:1px solid #c48941;color:#804600;-moz-text-shadow:0 1px 0 #fff;-webkit-text-shadow:0 1px 0 #fff;text-shadow:0 1px 0 #fff}#tqr-menu button:focus{-webkit-box-shadow:0 0 5px 2px #f2c998;box-shadow:0 0 5px 2px #f2c998;outline:0}#tqr-menu input{border:1px solid #c48941!important;color:#804600;-moz-text-shadow:0 1px 0 #fff;-webkit-text-shadow:0 1px 0 #fff;text-shadow:0 1px 0 #fff}#tqr-menu input:focus{border:1px solid #c48941!important;-webkit-box-shadow:0 0 5px 2px #f2c998!important;box-shadow:0 0 5px 2px #f2c998!important;outline:0!important}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:0 0}::-webkit-scrollbar-thumb{background:#f2c998;border-radius:10px}::-webkit-scrollbar-thumb:hover{background:#f2c998}.tqr-header{width:100%;height:38px;display:flex;justify-content:center;align-items:center;border-radius:5px 5px 0 0;background-color:var(--tqr-primary-color);display:flex;cursor:pointer;position:relative;top:0;z-index:1002}.tqr-footer{width:100%;height:38px;display:flex;justify-content:center;align-items:center;border-radius:0 0 5px 5px;background-color:var(--tqr-primary-color);display:flex;position:absolute;bottom:0;z-index:1001}.tqr-body{width:calc(100% - 30px);height:calc(100% - 96px);padding:10px 15px;overflow-y:scroll}.collapsed>.tqr-body{display:none}.tqr-headline{font-weight:700;font-size:20px}.tqr-subheadline{font-weight:700;font-size:18px}.tqr-content+.tqr-content{margin-top:20px}.tqr-content>:nth-child(2){margin-top:5px}#tqr-log-window{width:100%;height:100px;display:flex;flex-direction:column;background-color:var(--tqr-primary-color);border-radius:5px;padding:1.25px 4px;overflow-y:scroll}.tqr-log-error{color:#df0000}.tqr-log-success{color:#00c900}#tqr-conf-form>input:not([type=checkbox]){width:100%;text-align:center}.tqr-small-spacer{width:100%;height:5px}.tqr-highlight{background-color:#90ee90!important}
`
            +"</style>");
    }

    static injectInterface() {
        $(strings.ids.tiss.header).prepend(
`
<div id="tqr-menu" class="collapsed"><div class="tqr-header" onclick="document.getElementById(&#34;tqr-menu&#34;).classList.toggle(&#34;collapsed&#34;)"><span class="tqr-headline">Easy Auto Registration</span></div><div class="tqr-body"><div class="tqr-content"><span class="tqr-subheadline">Log</span><div id="tqr-log-window"></div></div><div class="tqr-content"><span class="tqr-subheadline">Controls</span><div class="tqr-controls"><select name="tqr-select-option" id="tqr-select-option"></select> <button id="tqr-button-save">Save</button> <button id="tqr-button-delete">Delete</button> <button id="tqr-button-start">Start</button> <button id="tqr-button-stop">Stop</button></div></div><div class="tqr-content" id="tqr-conf-form"><span class="tqr-subheadline">Configurations</span></div></div><div class="tqr-footer"></div></div>
`
        )
    }

    static injectOptions(optionsToInject) {
        if (optionsToInject === undefined) { // Initial loading of the page
            optionsToInject = TQROption.loadTQROption(TissQuickRegistration.getLVANumber(), TissQuickRegistration.getRegistrationType());
        }
        else if (typeof optionsToInject === "string") { // When selected in dropdown
            optionsToInject = optionsToInject.split("/");
            optionsToInject = TQROption.loadTQROption(optionsToInject[0], optionsToInject[1]);
        }

        if (optionsToInject === null) { // When on a confirm page
            optionsToInject = TQROption.loadTQROptionFromDspwid(TissQuickRegistration.getDspwid());

            if (optionsToInject === null) {
                throw new Error("Something went wrong loading configuration");
            }

            console.log(optionsToInject);
        }
        else {
            optionsToInject.dspwid(TissQuickRegistration.getDspwid());
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
        $("#tqr-menu > .tqr-footer").last().html('<span id="tqr-countdown" class="tqr-subheadline">No countdown to display</span>');
    }

    static removeCountdownField() {
        $(strings.ids.tqr.countdown).remove();
    }

    static manageControlAccess() {
        if (TissQuickRegistration.options.started.val()) {
            TissQuickRegistration.getOptionSelect().disable();
            TissQuickRegistration.getButtonSave().disable();
            TissQuickRegistration.getButtonDelete().disable();
            TissQuickRegistration.getButtonStart().disable();
            TissQuickRegistration.getButtonStop().enable();
        }
        else {
            TissQuickRegistration.getOptionSelect().enable();
            TissQuickRegistration.getButtonSave().enable();
            TissQuickRegistration.getButtonDelete().enable();
            TissQuickRegistration.getButtonStart().enable();
            TissQuickRegistration.getButtonStop().disable();
        }
    }

    static hookControlEvents() {
        TissQuickRegistration.getButtonSave().on("click", function () {
            TissQuickRegistration.options.setOptions(TissQuickRegistration.getDataFromConfigurationSection()).save();
            TissQuickRegistration.updateOptionDropdown(TissQuickRegistration.options.getKey());
            TissQuickRegistration.manageControlAccess();
            TissQuickRegistration.log("Saved options to storage");
        });

        TissQuickRegistration.getButtonDelete().on("click", function () {
            TissQuickRegistration.options.remove();
            TissQuickRegistration.updateOptionDropdown();
            TissQuickRegistration.manageControlAccess();
            TissQuickRegistration.log("Deleted options from storage");
        });

        TissQuickRegistration.getButtonStart().on("click", function () {
            let selectedKey = TissQuickRegistration.getLVANumber() + "/" + TissQuickRegistration.getRegistrationType();

            if (TissQuickRegistration.options.getKey() != selectedKey
                && !TissQuickRegistration.isConfirmURL()) {
                TissQuickRegistration.error("Cannot started with these options!");
                return;
            }

            TissQuickRegistration.options.started(true);
            TissQuickRegistration.getButtonSave().click();
            TissQuickRegistration.manageControlAccess();
            TissQuickRegistration.getConfigurationInputFields().each(function () {
                $(this).disable();
            });

            TissQuickRegistration.success("Script started!");
            TissQuickRegistration.tissQuickRegistration();
        });

        TissQuickRegistration.getButtonStop().on("click", function () {
            TissQuickRegistration.options.started(false);
            TissQuickRegistration.getButtonSave().click();
            TissQuickRegistration.manageControlAccess();
            TissQuickRegistration.getConfigurationInputFields().each(function () {
                $(this).enable();
            });
            TissQuickRegistration.getHighlightedElements().each(function () {
                TissQuickRegistration.removeHighlight(this);
            });
            TissQuickRegistration.error("Script stopped!");
        });

        TissQuickRegistration.getOptionSelect().on("input", function (event) {
            TissQuickRegistration.log("Loading " + event.target.value);
            TissQuickRegistration.injectOptions(event.target.value);
            TissQuickRegistration.manageControlAccess();
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

    static pageCountdown(text) {
        let out = TissQuickRegistration.getCountdownField();
        out.text(text);
    }

    static highlight(object) {
        $(object).addClass(strings.classes.tqr.highlight.substring(1));
    }
    
    static removeHighlight(object) {
        $(object).removeClass(strings.classes.tqr.highlight.substring(1));
    }

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

    static refreshPage() {
        location.reload();
    }

    static isConfirmURL() {
        return autoConfirmUrls.includes(location.href);
    }

    static disableAllElements() {
        $("#tqr-menu button, #tqr-menu input, #tqr-menu select").each(function () {
            $(this).disable();
        });
    }

    //
    //  End of Tools
    ////////////////////////////////////////////
};

new TissQuickRegistration();
