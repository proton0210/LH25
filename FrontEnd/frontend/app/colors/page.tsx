export default function ColorsPage() {
  const colorGroups = [
    {
      name: "Primary Pink",
      colors: [
        { name: "pink-950", value: "#620042" },
        { name: "pink-900", value: "#870557" },
        { name: "pink-800", value: "#A30664" },
        { name: "pink-700", value: "#BC0A6F" },
        { name: "pink-600", value: "#DA127D" },
        { name: "pink-500", value: "#E8368F" },
        { name: "pink-400", value: "#F364A2" },
        { name: "pink-300", value: "#FF8CBA" },
        { name: "pink-200", value: "#FFB8D2" },
        { name: "pink-100", value: "#FFE3EC" },
      ],
    },
    {
      name: "Cool Grey",
      colors: [
        { name: "grey-900", value: "#1F2933" },
        { name: "grey-800", value: "#323F4B" },
        { name: "grey-700", value: "#3E4C59" },
        { name: "grey-600", value: "#52606D" },
        { name: "grey-500", value: "#616E7C" },
        { name: "grey-400", value: "#7B8794" },
        { name: "grey-300", value: "#9AA5B1" },
        { name: "grey-200", value: "#CBD2D9" },
        { name: "grey-100", value: "#E4E7EB" },
        { name: "grey-50", value: "#F5F7FA" },
      ],
    },
    {
      name: "Purple",
      colors: [
        { name: "purple-950", value: "#44056E" },
        { name: "purple-900", value: "#580A94" },
        { name: "purple-800", value: "#690CB0" },
        { name: "purple-700", value: "#7A0ECC" },
        { name: "purple-600", value: "#8719E0" },
        { name: "purple-500", value: "#9446ED" },
        { name: "purple-400", value: "#A368FC" },
        { name: "purple-300", value: "#B990FF" },
        { name: "purple-200", value: "#DAC4FF" },
        { name: "purple-100", value: "#F2EBFE" },
      ],
    },
    {
      name: "Cyan",
      colors: [
        { name: "cyan-950", value: "#05606E" },
        { name: "cyan-900", value: "#07818F" },
        { name: "cyan-800", value: "#099AA4" },
        { name: "cyan-700", value: "#0FB5BA" },
        { name: "cyan-600", value: "#1CD4D4" },
        { name: "cyan-500", value: "#3AE7E1" },
        { name: "cyan-400", value: "#62F4EB" },
        { name: "cyan-300", value: "#92FDF2" },
        { name: "cyan-200", value: "#C1FEF6" },
        { name: "cyan-100", value: "#E1FCF8" },
      ],
    },
    {
      name: "Red",
      colors: [
        { name: "red-950", value: "#610316" },
        { name: "red-900", value: "#8A041A" },
        { name: "red-800", value: "#AB091E" },
        { name: "red-700", value: "#CF1124" },
        { name: "red-600", value: "#E12D39" },
        { name: "red-500", value: "#EF4E4E" },
        { name: "red-400", value: "#F86A6A" },
        { name: "red-300", value: "#FF9B9B" },
        { name: "red-200", value: "#FFBDBD" },
        { name: "red-100", value: "#FFE3E3" },
      ],
    },
    {
      name: "Yellow",
      colors: [
        { name: "yellow-950", value: "#8D2B0B" },
        { name: "yellow-900", value: "#B44D12" },
        { name: "yellow-800", value: "#CB6E17" },
        { name: "yellow-700", value: "#DE911D" },
        { name: "yellow-600", value: "#F0B429" },
        { name: "yellow-500", value: "#F7C948" },
        { name: "yellow-400", value: "#FADB5F" },
        { name: "yellow-300", value: "#FCE588" },
        { name: "yellow-200", value: "#FFF3C4" },
        { name: "yellow-100", value: "#FFFBEA" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Color Palette
            </h1>
            <p className="text-xl text-muted-foreground">
              Brand colors extracted from your palette images
            </p>
          </div>

          <div className="space-y-12">
            {colorGroups.map((group) => (
              <div key={group.name} className="space-y-4">
                <h2 className="text-2xl font-semibold">{group.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-4">
                  {group.colors.map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div
                        className="h-20 w-full rounded-lg shadow-sm border"
                        style={{ backgroundColor: color.value }}
                      />
                      <div className="text-xs space-y-1">
                        <p className="font-medium">{color.name}</p>
                        <p className="text-muted-foreground">{color.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Usage</h2>
            <p className="text-sm text-muted-foreground mb-2">
              These colors are available as Tailwind CSS classes:
            </p>
            <code className="text-sm bg-background p-2 rounded block">
              bg-pink-600, text-purple-500, border-cyan-300, etc.
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}