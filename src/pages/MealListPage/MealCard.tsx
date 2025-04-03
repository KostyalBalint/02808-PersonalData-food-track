import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Chip,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MealData } from "../../../functions/src/constants.ts";
import { format } from "date-fns";

export const MealCard = (props: { meal: MealData }) => {
  const navigate = useNavigate();

  return (
    <Card
      sx={{ cursor: "pointer" }}
      onClick={() => navigate(`/meal/${props.meal.id}`)}
    >
      <CardHeader title={props.meal.name} />
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          image={props.meal.imageUrl}
          alt="Uploaded image"
          loading="lazy"
          sx={{ aspectRatio: 1 }}
        />
        <Chip
          label={format(props.meal.createdAt.toDate(), "HH:mm")}
          size="small"
          color="primary"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
            m: 1,
          }}
        />
      </Box>
      <CardContent>
        <Typography variant="h6">Ingredients:</Typography>
        <List>
          {!props.meal.ingredients && <Typography>No ingredients</Typography>}
          {props.meal.ingredients?.map((ingredient) => (
            <ListItem
              key={ingredient.name}
              disableGutters
              disablePadding
              sx={{ ml: 2 }}
            >
              <Typography variant="body1">
                - {ingredient.amount} {ingredient.unit} {ingredient.name}
              </Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
