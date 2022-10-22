import './VariantLine.css';
import { useEffect, useState } from "react";

type VariantLineProps = { currMainLineSan: string[], currScore: number, currMove: number }

export function VariantLine(props: VariantLineProps) {

  const [currMainLineSanAndNumbers, setCurrMainLineSanAndNumbers] = useState<string[]>([]);

  useEffect(() => {
    let currMainLineSanAndNumbers = [];
    var moveNumber = props.currMove + 4;

    if (props.currMainLineSan.length > 0 && moveNumber % 2 == 1) {
      currMainLineSanAndNumbers.push(`${(moveNumber - 1) / 2}.`);
    } else if (props.currMainLineSan.length > 0) {
      currMainLineSanAndNumbers.push(`${(moveNumber - 2) / 2}...`);
    }

    for (const moveSan of props.currMainLineSan) {
      currMainLineSanAndNumbers.push(moveSan);

      if (moveNumber % 2 == 0) {
        currMainLineSanAndNumbers.push(`${moveNumber / 2}.`);
      }
      moveNumber++;
    }

    setCurrMainLineSanAndNumbers(currMainLineSanAndNumbers);
  }, [props.currMainLineSan]);

  function chooseColorClass(index: number) {
    if (index == 0) {
      return 'variant-number-indication';
    }
    return index % 3 == (props.currMove % 2 == 0 ? 2 : 0) ? 'variant-number-indication' : '';
  }

  return (<div className='variant-line'><div className='variant-line-content'>{
    currMainLineSanAndNumbers.length == 0 ?
      <span>...</span> :
      <><b>{(Math.max(Math.min(props.currScore / 100, 10), -10)).toFixed(2)}</b> <span className="lichess-font">
        {
          currMainLineSanAndNumbers.map((x, i) => (
            <span key={i} className={chooseColorClass(i)}>{x} </span>
          ))
        }
      </span></>
  }</div></div>)
}
