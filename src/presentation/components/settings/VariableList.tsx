'use client';

import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import { TemplateVariableDefinition } from '@/application/usecases/UpdateMessageTemplateUseCase';

interface VariableListProps {
  readonly variables: readonly TemplateVariableDefinition[];
  readonly onInsert: (variableName: string) => void;
}

export function VariableList({ variables, onInsert }: VariableListProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        利用可能な変数
      </Typography>
      <List dense disablePadding>
        {variables.map((variable) => (
          <ListItem
            key={variable.name}
            secondaryAction={
              <Button size="small" variant="outlined" onClick={() => onInsert(variable.name)}>
                挿入
              </Button>
            }
          >
            <Chip
              label={`{{${variable.name}}}`}
              size="small"
              variant="outlined"
              sx={{ mr: 1.5, fontFamily: 'monospace' }}
            />
            <ListItemText primary={variable.label} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
