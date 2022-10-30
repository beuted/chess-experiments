import './SuccessAnimationIcon.css';

type SuccessAnimationIconProps = {}

export function SuccessAnimationIcon(props: SuccessAnimationIconProps) {

  return (
    <div className="success-checkmark">
      <div className="check-icon">
        <span className="icon-line line-tip"></span>
        <span className="icon-line line-long"></span>
        <div className="icon-circle"></div>
        <div className="icon-fix"></div>
      </div>
    </div>
  )
}