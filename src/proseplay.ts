import "./proseplay.less";

import { Window } from "./window";
import { Choice } from "./choice";

type Token = {
  strings: string[]
  linkIndex?: number | null,
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
  hypothetically: `(hypothetically|hello)[1]
(what if|i said)[1]
(we fell|and held)[1]
(in love|till death)[1]`
};

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

  constructor(el: HTMLElement) {
    this.el = el;
    this.el.classList.add("proseplay");
    window.addEventListener("resize", this.handleResize);
  }

  private static createInstance(): ProsePlay {
    const container = document.createElement("div");
    container.classList.add("proseplay");
    document.body.appendChild(container);
    const pp = new ProsePlay(container);
    return pp;
  }

  load(name: "homophones" | "hypothetically" | "dickinson"): ProsePlay {
    this.lines = [];
    this.windows = [];
    this.links = [];

    return this.parse(samples[name]);
  }

  static load(name: "homophones" | "hypothetically" | "dickinson"): ProsePlay {
    const pp = ProsePlay.createInstance();
    return pp.load(name);
  }

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
        "(\\[(\\d)+\\])?" // link index
        , "g"));
      const stringsIndex = 1,
        linkIndex = 4;

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
          lineEl.append(document.createTextNode(token.strings[0]));
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

  generate(): void {
    if (this._isExpanded) return;

    let windowsDragged: Window[] = [];
    this.windows.forEach(window => {
      if (windowsDragged.includes(window)) return;
      let choiceIndex = window.random();
      windowsDragged.push(window);
      if (window.linkIndex) {
        this.links[window.linkIndex].forEach(otherWindow => {
          if (windowsDragged.includes(otherWindow)) return;
          otherWindow.random(choiceIndex);
          windowsDragged.push(otherWindow);
        });
      }
    });
  }

  expand(): void {
    this._isExpanded = true;
    this.el.classList.toggle("proseplay-is-expanded", this._isExpanded);

    const em = parseFloat(getComputedStyle(this.el).fontSize);
    
    this.lines.forEach(line => {
      let marginBottom = 0;

      line.windows.forEach(window => {
        let height = window.el.scrollHeight - window.listEl.offsetTop;
        window.el.style.height = `${height}px`;
        
        let y = window.el.scrollHeight - (window.currentChoiceIndex + 1) * 1.25 * em - 0.06 * em;
        window.el.style.top = `${y}px`;
        window.el.style.marginTop = `${-y}px`;
        marginBottom = Math.max(marginBottom, y);

        window.listEl.style.top = "0px";

        let maxWidth = 0;
        window.choices.forEach(choice => {
          choice.el.style.opacity = "1";
          maxWidth = Math.max(maxWidth, choice.el.offsetWidth);
        });
        window.el.style.width = `${maxWidth}px`;

      });

      line.el.style.marginBottom = `${marginBottom}px`;
    });
  }

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

        window.activateChoice();
      });
    });
  }

  isExpanded(): boolean {
    return this._isExpanded;
  }

  snapshot(): string {
    let text = "";
    this.lines.forEach(line => {
      line.tokens.forEach(token => {
        if (token instanceof Window) {
          text += token.choices[token.currentChoiceIndex].text;
        } else {
          text += token;
        }
      })
      text += "\n";
    });

    return text;
  }

  setFunction(name: string, fnc: Function): void {
    this.functions[name] = fnc;
    this.windows.forEach(window => window.setFunction(name, fnc));
  }

  private handleResize = (): void => {
    this.windows.forEach(window => window.activateChoice());
  }
}

export { ProsePlay }