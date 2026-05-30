import { Button } from "@repo/ui"
function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <Button variant="outline">漂亮的新按钮</Button>
      <Button variant="outline" size="icon" aria-label="Submit">
      </Button>
    </div>
  )
}

export default ButtonDemo
