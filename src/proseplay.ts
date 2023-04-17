import "./proseplay.less";

import { Window } from "./window";
import { Choice } from "./choice";

type Token = {
  strings: string[]
  linkIndex?: number | null,
  horizontal?: boolean,
  functionNames?: string[]
};
type TokenizedLine = Token[];
type TokenizedText = TokenizedLine[];

const lineTemplate = document.createElement("div");
lineTemplate.classList.add("proseplay-line");

const samples = {
  dickinson: `We talked with each other about each other
Though neither of us spoke —
We were (too engrossed with|listening to) the Second’s Races
And the Hoofs of the Clock —
Pausing in Front of our (Sentenced Faces|Foundering Faces)
(Time’s Decision shook —|Time compassion Took)
Arks of Reprieve he offered to us —
Ararats — we took —`,
  homophones: `in the (mist|missed) (see|sea)
(prey|pray) in the (morning|mourning)
for (words|worlds) that (exit|exist)
as (seep|sleep)`,
  hypothetically: `(hypothetically|hello)[1-]
(what if|i said)[1-]
(we fell|and held)[1-]
(in love|till death)[1-]`
};

let EM: number;

class ProsePlay {
  private el: HTMLElement;

  private lines: {
    el: HTMLElement,
    tokens: (string | Window)[],
    windows: Window[]
  }[] = [];
  private windows: Window[] = [];
  private links: Window[][] = [];

  private _isExpanded: boolean = false;

  private functions: {
    [name: string]: Function
  } = {};

  /**
   * Create a new ProsePlay object, which will be contained in the given HTML element.
   * @param el The HTML element in which the ProsePlay instance will be contained.
   */
  constructor(el: HTMLElement) {
    this.el = el;
    this.el.classList.add("proseplay");
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("DOMContentLoaded", this.handleResize);

    EM = parseInt(getComputedStyle(el).fontSize);
  }

  private static createInstance(): ProsePlay {
    const container = document.createElement("div");
    container.classList.add("proseplay");
    document.body.appendChild(container);
    const pp = new ProsePlay(container);
    return pp;
  }

  /**
   * Load a sample.
   * @param name The name of the sample to load.
   * @returns The ProsePlay instance with the parsed text.
   */
  load(name: "homophones" | "hypothetically" | "dickinson"): ProsePlay {
    this.lines = [];
    this.windows = [];
    this.links = [];

    return this.parse(samples[name]);
  }

  /**
   * Create a ProsePlay instance and load a sample.
   * @param name The name of the sample to load.
   * @returns A ProsePlay instance with the parsed text.
   */
  static load(name: "homophones" | "hypothetically" | "dickinson"): ProsePlay {
    const pp = ProsePlay.createInstance();
    return pp.load(name);
  }

  /**
   * Parse the given string.
   * @param str The formatted string to parse.
   * @returns The ProsePlay instance with the parsed text.
   */
  parse(str: string): ProsePlay {
    this.lines = [];
    this.windows = [];
    this.links = [];

    str = str.trim();
    let textTokens: TokenizedText = [];
    let lines = str.split("\n");
    lines.forEach(line => {
      const lineTokens: TokenizedLine = [];
      let m = line.matchAll(new RegExp(
        "\\(" + // open parentheses
          "(" + // start capturing group
            "[^(|)]+" + // first string
            "\\|" + // pipe
            "([^(|)]+\\|?)+" + // one or more strings, with optional pipe
          ")" + // end capturing group
        "\\)" + // close parentheses
        "(\\[(\\d)*(-)?\\])?" // link index
        , "g"));
      const stringsIndex = 1,
        linkIndex = 4,
        orientationIndex = 5;

      let currIndex = 0;
      for (const match of m) {
        const index = match.index as number;
        let isEscaped = line[index - 2] === "\\";

        let prevToken: Token = {strings: []},
          currentToken: Token = {strings: []};
        if (isEscaped) {
          prevToken.strings = [line.slice(currIndex, index - 1)];
          currentToken.strings = [line.slice(index, index + match[0].length)];
        } else {
          prevToken.strings = [line.slice(currIndex, index)];
          currentToken.strings = match[stringsIndex].split("|");
          currentToken.strings.forEach((str, i) => {
            let [s, fnc] = str.split("->");
            if (fnc) {
              if (!currentToken.functionNames) {
                currentToken.functionNames = [];
              }
              currentToken.functionNames[i] = fnc;

              currentToken.strings[i] = s;
            }
          });
          if (match[linkIndex]) {
            currentToken.linkIndex = parseInt(match[linkIndex]);
          }
          if (match[orientationIndex] && (match[orientationIndex] === "|" || match[orientationIndex] === "-")) {
            currentToken.horizontal = match[orientationIndex] === "-";
          }
        }
        lineTokens.push(prevToken);
        lineTokens.push(currentToken);

        currIndex = index + match[0].length;
      }
      if (currIndex < line.length) {
        lineTokens.push({strings: [line.slice(currIndex)]});
      }
      textTokens.push(lineTokens);
    });
  
    this.constructText(textTokens);

    return this;
  }

  /**
   * Create a new ProsePlay instance and parse the given string.
   * @param str The formatted string to parse.
   * @returns A ProsePlay instance with the parsed text.
   */
  static parse(str: string): ProsePlay {
    const pp = ProsePlay.createInstance();
    pp.parse(str);
    return pp;
  }
  
  private constructText(text: TokenizedText): void {
    this.el.innerHTML = "";
    text.forEach(line => {
      const lineEl = lineTemplate.cloneNode(true) as HTMLElement;
      this.el.appendChild(lineEl);
      this.lines.push({
        el: lineEl,
        tokens: [],
        windows: []
      });

      line.forEach(token => {
        if (token.strings.length === 1) {
          const span = document.createElement("span");
          span.classList.add("proseplay-plaintext");
          span.innerText = token.strings[0];
          lineEl.append(span);
          this.lines[this.lines.length - 1].tokens.push(token.strings[0]);
        } else {
          const window = new Window(lineEl);
          if (token.linkIndex) {
            if (!this.links[token.linkIndex]) {
              this.links[token.linkIndex] = [];
            }
            this.links[token.linkIndex].push(window);
          }
          if (token.functionNames) {
            window.setFunctionNames(token.functionNames);
          }
          for (const name in this.functions) {
            window.setFunction(name, this.functions[name]);
          }
          if (token.horizontal) {
            window.setHorizontal();
          }
          this.lines[this.lines.length - 1].tokens.push(window);
          this.lines[this.lines.length - 1].windows.push(window);
          this.windows.push(window);
          token.strings.forEach(str => window.addChoice(new Choice(str)));
          window.activateChoice(window.choices[0]);
        }
      });
      if (line.length === 0) {
        lineEl.innerHTML = "&nbsp;";
      }
    });

    this.links.forEach((windows, i) => {
      windows.forEach(window => {
        const otherWindows = windows.filter(otherWindow => otherWindow !== window);
        window.setLink(i, otherWindows);
      });
    });
  }

  /**
   * Slide each window to a random choice. If windows are linked, they will move to the same choice index together. If no `windowIndexes` is specified, all windows will be randomised.
   */
  randomise(options?: { windowIndexes?: number[], millis?: number }): void {
    if (this._isExpanded) return;

    const windowIndexes = options?.windowIndexes || this.windows.map((_, i) => i);
    
    let windowsDragged: Window[] = [];
    windowIndexes.forEach(i => {
      const window = this.windows[i];
      if (!window) return;

      if (windowsDragged.includes(window)) return;

      let choiceIndex = window.random();
      window.slideToChoice(choiceIndex, options?.millis);
      windowsDragged.push(window);
      if (window.linkIndex) {
        this.links[window.linkIndex].forEach(otherWindow => {
          if (windowsDragged.includes(otherWindow)) return;
          otherWindow.slideToChoice(choiceIndex, options?.millis);
          windowsDragged.push(otherWindow);
        });
      }
    });
  }

  /**
   * Alias for `randomise()`.
   * @param windowIndexes An optional list of window indexes to randomise.
   */
  randomize(options?: { windowIndexes?: number[], millis?: number }): void {
    this.randomise(options);
  }

  /**
   * Expand all windows to show all choices at once. When this is enabled, all other interactions are disabled until `collapse()` is called.
   */
  expand(): void {
    this._isExpanded = true;
    this.el.classList.toggle("proseplay-is-expanded", this._isExpanded);

    const em = parseFloat(getComputedStyle(this.el).fontSize);
    
    this.lines.forEach(line => {
      let marginBottom = 0;

      line.windows.forEach(window => {
        let height = window.el.scrollHeight - window.listEl.offsetTop;
        window.el.style.height = `${height}px`;
        
        let y = window.el.scrollHeight - (window.currentIndex + 1) * 1.25 * em - 0.06 * em;
        window.el.style.top = `${y}px`;
        window.el.style.marginTop = `${-y}px`;
        marginBottom = Math.max(marginBottom, y);

        window.listEl.style.top = "0px";

        let maxWidth = 0;
        window.choices.forEach((choice, i) => {
          choice.el.style.opacity = "1";
          if (!window.horizontal) {
            maxWidth = Math.max(maxWidth, choice.el.offsetWidth);
          } else {
            if (i > 0) {
              maxWidth += EM;
            }
            maxWidth += choice.el.offsetWidth;
          }
        });
        window.el.style.width = `${maxWidth}px`;

        window.isHoverable = false;
      });

      line.el.style.marginBottom = `${marginBottom}px`;
    });
  }

  /**
   * Collapse all windows.
   */
  collapse(): void {
    this._isExpanded = false;
    this.el.classList.toggle("proseplay-is-expanded", this._isExpanded);

    this.lines.forEach(line => {
      line.el.style.removeProperty("margin-bottom");

      line.windows.forEach(window => {
        window.el.style.removeProperty("height");
        window.el.style.removeProperty("top");
        window.el.style.removeProperty("margin-top");
        window.listEl.style.removeProperty("top");
        window.choices.forEach(choice => {
          choice.el.style.removeProperty("opacity");
        });
        window.listEl.style.removeProperty("width");

        window.isHoverable = true;

        window.activateChoice();
      });
    });
  }

  /**
   * Check if windows are expanded or collapsed.
   * @returns A boolean representing whether windows are expanded (true) or collapsed (false).
   */
  get isExpanded(): boolean {
    return this._isExpanded;
  }

  /**
   * Return the current text.
   * @returns A string of the current text.
   */
  snapshot(): string {
    let text = "";
    this.lines.forEach(line => {
      line.tokens.forEach(token => {
        if (token instanceof Window) {
          text += token.choices[token.currentIndex].text;
        } else {
          text += token;
        }
      })
      text += "\n";
    });

    return text;
  }

  /**
   * Set function to be called when certain choices are selected.
   * @param name Name of function.
   * @param fnc Function to be called.
   */
  setFunction(name: string, fnc: Function): void {
    this.functions[name] = fnc;
    this.windows.forEach(window => window.setFunction(name, fnc));
  }

  private handleResize = (): void => {
    this.windows.forEach(window => window.activateChoice());
  }

  /**
   * Return a nested list of choices in each window.
   */
  get choices(): string[][] {
    return this.windows.map(window => {
      return window.choices.map(choice => choice.text);
    });
  }

  /**
   * Return a list of indexes to which each window is currently set.
   */
  get currentIndexes(): number[] {
    return this.windows.map(window => window.currentIndex);
  }

  /**
   * Slide a specified window to a specified choice.
   * @param windowIndex The index of the window to slide.
   * @param choiceIndex The index of the choice to slide to.
   */
  slideWindow(windowIndex: number, choiceIndex: number, options?: { millis?: number }): void {
    if (windowIndex > this.windows.length - 1) return;
    const window = this.windows[windowIndex];
    if (choiceIndex > window.choices.length - 1) return;
    window.slideToChoice(choiceIndex, options?.millis);
  }
}

export { ProsePlay }