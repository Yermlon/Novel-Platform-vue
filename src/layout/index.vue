<template>
  <div class="layout-container">
    <LayoutHeader />
    <main class="content">
      <template v-if="isPersonalRoute">
        <PsLayout/>
      </template>

      <!-- <template v-if="isAuthorRoute">
        <AuthorLayout />
      </template> -->

      <template v-else>
        <router-view />
      </template>

    </main>
  </div>
</template>

<script>
import LayoutHeader from './LayoutHeader.vue';
import { ref, watch } from 'vue';
import { useRoute } from "vue-router";
import PsLayout from './PsLayout.vue';
// import AuthorLayout from './AuthorLayout.vue';

export default{
  name: 'Layout',
  components:{
    LayoutHeader,
    PsLayout,
    // AuthorLayout,
  },
  setup(){
    const route = useRoute();
    const isPersonalRoute = ref(route.path.startsWith('/personal'));
    // const isAuthorRoute = ref(route.path.startsWith('/author'));

    watch(() => route.path, (newPath) => {
      isPersonalRoute.value = newPath.startsWith('/personal');
      // isAuthorRoute.value = newPath.startsWith('/author');
    });

    return{
      isPersonalRoute,
      // isAuthorRoute
    };
  }
}

</script>