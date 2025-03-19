import {
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MealData } from "../../constants.ts";

export const MealCard = (props: { meal: MealData }) => {
  const navigate = useNavigate();

  return (
    <Card
      sx={{ cursor: "pointer" }}
      onClick={() => navigate(`/meal/${props.meal.id}`)}
    >
      <CardMedia
        component="img"
        image={props.meal.imageUrl}
        alt="Uploaded image"
        loading="lazy"
      />
      <CardContent>
        <Typography variant="h5">Ingredients:</Typography>
        <List>
          {!props.meal.ingredients && <Typography>No ingredients</Typography>}
          {props.meal.ingredients?.map((ingredient) => (
            <ListItem
              key={ingredient.id}
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
