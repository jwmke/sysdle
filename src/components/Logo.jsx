import logo from '../assets/sysdle.svg'

export default function Logo({ onClick }) {
  return (
    <div className="absolute top-4 left-4 z-10 lg:hidden">
      <img
        src={logo}
        alt="Sysdle"
        className="h-10 brightness-0 invert cursor-pointer"
        onClick={onClick}
      />
    </div>
  )
}
