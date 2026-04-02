import { Box, ListItem, ListItemText } from "@mui/material";

function SearchItem({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <ListItem dense disableGutters>
      <ListItemText
        primary={<Box sx={{ fontWeight: 600 }}>{title}</Box>}
        secondary={subtitle}
      />
      {right ? <Box sx={{ ml: 1 }}>{right}</Box> : null}
    </ListItem>
  );
}

export default SearchItem;
