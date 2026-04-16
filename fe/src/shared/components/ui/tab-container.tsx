import * as React from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Tab,
  Tabs,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export type TabItem = {
  label: string;
  icon?: React.ReactNode;
  value: string;
  content: React.ReactNode;
};

type TabContainerProps = {
  tabs: TabItem[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  tabSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  tabsMode?: "horizontal" | "vertical";
};

function renderTabLabel(tab: TabItem) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        minWidth: 0,
      }}
    >
      {tab.icon ? (
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            "& svg": {
              fontSize: 18,
            },
          }}
        >
          {tab.icon}
        </Box>
      ) : null}
      <Box component="span" sx={{ minWidth: 0 }}>
        {tab.label}
      </Box>
    </Box>
  );
}

export function TabContainer({
  tabs,
  defaultValue,
  onChange,
  tabSx,
  contentSx,
  tabsMode = "horizontal",
}: TabContainerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [value, setValue] = React.useState<string>(
    defaultValue ?? tabs[0]?.value ?? ""
  );

  React.useEffect(() => {
    if (!tabs.length) {
      setValue("");
      return;
    }

    if (!tabs.some((t) => t.value === value)) {
      const fallback = defaultValue ?? tabs[0]?.value ?? "";
      setValue(fallback);
      if (fallback) onChange?.(fallback);
    }
  }, [defaultValue, onChange, tabs, value]);

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleMobileChange = (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;
    setValue(nextValue);
    onChange?.(nextValue);
  };

  const active = tabs.find((t) => t.value === value);

  return (
    <Box sx={{ width: "100%" }}>
      {isMobile ? (
        <FormControl fullWidth sx={tabSx}>
          <Select value={value} onChange={handleMobileChange} size="small">
            {tabs.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {renderTabLabel(t)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : tabsMode === "vertical" ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            sx={{
              minWidth: 220,
              maxHeight: "70vh",
              overflowY: "auto",
              borderRight: 1,
              borderColor: "divider",
              ".MuiTabs-indicator": {
                left: 0,
              },
              ...tabSx,
            }}
          >
            {tabs.map((t) => (
              <Tab
                key={t.value}
                label={renderTabLabel(t)}
                value={t.value}
                sx={{ alignItems: "flex-start", textAlign: "left" }}
              />
            ))}
          </Tabs>
          <Box sx={{ flex: 1, minWidth: 0, ...contentSx }}>{active?.content}</Box>
        </Box>
      ) : (
        <Box>
          <Tabs
            variant="scrollable"
            value={value}
            onChange={handleChange}
            sx={{ borderBottom: 1, borderColor: "divider", ...tabSx }}
          >
            {tabs.map((t) => (
              <Tab key={t.value} label={renderTabLabel(t)} value={t.value} />
            ))}
          </Tabs>

          <Box sx={{ mt: 2, ...contentSx }}>{active?.content}</Box>
        </Box>
      )}

      {isMobile ? (
        <Box sx={{ mt: 2, ...contentSx }}>
          {active?.content}
        </Box>
      ) : null}
    </Box>
  );
}
